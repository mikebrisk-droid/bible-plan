/* Move to another device: everything worth keeping (followed plans, checkmarks, the streak log) as one
   payload, carried in a link (#import=…, compressed) or a backup file, and merged in on the other side.
   A one-time copy, not a sync. The link's data sits after the #, which browsers never send to the server.
   No DOM here; shell.js draws the sheets. Needs streaks.js (mergeActivity, isProgressKey). */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory(require('./streaks.js'));
	else root.rtbTransfer = factory(root.rtbStreaks);
})(this, function (S) {
	'use strict';

	var APP = 'read-the-bible', PLANS_KEY = 'rtb-plans', ACTIVITY_KEY = 'rtb-activity';

	function read(storage, key) { try { return JSON.parse(storage.getItem(key)); } catch (e) { return null; } }
	// "start|total|…|proverb-12" → ["start|total|…|proverb", 12]
	function split(key) { var i = key.lastIndexOf('-'); return [key.slice(0, i), +key.slice(i + 1)]; }

	/* ---------- This device → payload ---------- */

	function pack(storage, today) {
		var plans = read(storage, PLANS_KEY) || { list: [], current: null }, progress = {}, i, key;
		for (i = 0; i < storage.length; i++) {
			key = storage.key(i);
			if (!S.isProgressKey(key) || storage.getItem(key) !== 'true') continue;
			var p = split(key);
			(progress[p[0]] = progress[p[0]] || []).push(p[1]);
		}
		for (key in progress) progress[key].sort(function (a, b) { return a - b; });

		var activity = read(storage, ACTIVITY_KEY);
		if (activity) {
			// readings grouped by plan, so the long plan key is written once instead of once per day
			var marks = {};
			for (key in activity.marks || {}) {
				var m = split(key);
				(marks[m[0]] = marks[m[0]] || []).push([m[1], activity.marks[key]]);
			}
			activity = Object.assign({}, activity, { marks: marks });
		}

		return {
			app: APP, v: 1, at: today,
			plans: {
				list: (plans.list || []).map(function (e) { return { id: e.id, query: e.query, name: e.name || null, named: !!e.named, planId: e.planId || null }; }),
				current: plans.current || null
			},
			progress: progress,
			activity: activity
		};
	}

	function valid(p) { return !!p && p.app === APP && p.v === 1 && p.plans && Array.isArray(p.plans.list) && typeof p.progress === 'object'; }

	// what a payload holds, for the import question: [{ name, read, query }] and totals
	function summarize(p) {
		var readings = 0, k;
		for (k in p.progress) readings += p.progress[k].length;
		return { plans: p.plans.list.length, readings: readings, at: p.at || null, list: p.plans.list };
	}

	function readCount(p, key) { return (p.progress[key] || []).length; }

	/* ---------- Payload → this device (merge, never delete) ----------
	   opts.keyOf(query) gives a plan's progress key (shell.js keyOf); opts.newId() a fresh plan id.
	   Returns { plansAdded, readingsAdded }. */
	function apply(storage, p, opts) {
		if (!valid(p)) throw new Error('Not a Read the Bible transfer');
		var keyOf = opts.keyOf, mine = read(storage, PLANS_KEY) || { list: [], current: null }, idMap = {}, added = 0;
		mine.list = mine.list || [];

		p.plans.list.forEach(function (e) {
			if (!e || typeof e.query !== 'string') return;
			var k = keyOf(e.query), same = mine.list.filter(function (x) { return keyOf(x.query) === k; })[0];
			if (same) {
				// the same plan on both devices stays one plan
				if (!same.name && e.name) { same.name = e.name; same.named = e.named; }
				if (!same.planId && e.planId) same.planId = e.planId;
				idMap[e.id] = same.id;
				return;
			}
			var copy = { id: e.id, query: e.query, name: e.name || null, named: !!e.named, planId: e.planId || null };
			if (!copy.id || mine.list.some(function (x) { return x.id === copy.id; })) copy.id = opts.newId();
			idMap[e.id] = copy.id;
			mine.list.push(copy);
			added++;
		});
		if (!mine.current || !mine.list.some(function (x) { return x.id === mine.current; })) {
			mine.current = idMap[p.plans.current] || (mine.list[0] && mine.list[0].id) || null;
		}
		storage.setItem(PLANS_KEY, JSON.stringify(mine));

		var readingsAdded = 0;
		Object.keys(p.progress).forEach(function (prefix) {
			(p.progress[prefix] || []).forEach(function (n) {
				var key = prefix + '-' + n;
				if (!S.isProgressKey(key) || storage.getItem(key) === 'true') return;
				storage.setItem(key, 'true');
				readingsAdded++;
			});
		});

		if (p.activity) {
			var theirs = Object.assign({}, p.activity), marks = {}, prefix;
			for (prefix in theirs.marks || {}) theirs.marks[prefix].forEach(function (m) { marks[prefix + '-' + m[0]] = m[1]; });
			theirs.marks = marks;
			// plans that were already here keep their id here
			theirs.started = remap(theirs.started, idMap);
			theirs.finished = remap(theirs.finished, idMap);
			var here = read(storage, ACTIVITY_KEY);
			storage.setItem(ACTIVITY_KEY, JSON.stringify(here ? S.mergeActivity(here, theirs) : theirs));
		}
		return { plansAdded: added, readingsAdded: readingsAdded };
	}

	function remap(obj, idMap) {
		var out = {};
		for (var id in obj || {}) out[idMap[id] || id] = obj[id];
		return out;
	}

	/* ---------- Link and file ---------- */

	function toB64(bytes) {
		var s = '';
		for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
		return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	}
	function fromB64(str) {
		str = str.replace(/-/g, '+').replace(/_/g, '/');
		while (str.length % 4) str += '=';
		var bin = atob(str), out = new Uint8Array(bin.length);
		for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
		return out;
	}
	function pipe(bytes, stream) {
		return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
	}
	var canZip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

	/* base: the app's address without query or hash. 'z' = deflate-compressed JSON, 'j' = plain JSON */
	function toLink(p, base) {
		var bytes = new TextEncoder().encode(JSON.stringify(p));
		var done = canZip ? pipe(bytes, new CompressionStream('deflate-raw')).then(function (z) { return 'z' + toB64(z); }) : Promise.resolve('j' + toB64(bytes));
		return done.then(function (data) { return base + '#import=' + data; });
	}

	function isLink(hash) { return /^#import=/.test(hash || ''); }

	// resolves to a valid payload, or rejects (cut-off or mangled link)
	function fromLink(hash) {
		var m = /^#import=([zj])([A-Za-z0-9_-]+)/.exec(hash || '');
		if (!m) return Promise.reject(new Error('Not a transfer link'));
		var bytes;
		try { bytes = fromB64(m[2]); } catch (e) { return Promise.reject(e); }
		var json = m[1] === 'z' ? pipe(bytes, new DecompressionStream('deflate-raw')) : Promise.resolve(bytes);
		return json.then(function (b) {
			var p = JSON.parse(new TextDecoder().decode(b));
			if (!valid(p)) throw new Error('Not a Read the Bible transfer');
			return p;
		});
	}

	function toFile(p) { return new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }); }

	function fromFile(text) {
		var p = JSON.parse(text);
		if (!valid(p)) throw new Error('Not a Read the Bible backup');
		return p;
	}

	return { pack: pack, apply: apply, summarize: summarize, readCount: readCount, toLink: toLink, fromLink: fromLink, isLink: isLink,
		toFile: toFile, fromFile: fromFile, valid: valid };
});
