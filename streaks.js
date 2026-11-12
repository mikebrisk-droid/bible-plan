/* Streaks and badges: the reading log, streak math and badge rules.
   No DOM here. shell.js draws the Home chip, the streak sheet, the Badges view and the toasts,
   and feeds this file a snapshot of the followed plans through sync().
   Everything is kept in this browser's localStorage under one key (rtb-activity). */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.rtbStreaks = factory();
})(this, function () {
	'use strict';

	var KEY = 'rtb-activity';
	var ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];

	/* ---------- Dates (local calendar days as YYYY-MM-DD) ---------- */

	function pad(n) { return (n < 10 ? '0' : '') + n; }
	function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
	function parse(s) { var p = String(s).split('-'); return new Date(+p[0], p[1] - 1, +p[2]); }
	function strip(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
	// calendar days, so a daylight-saving change never skips or repeats a day
	function addDays(d, n) { var x = strip(d); x.setDate(x.getDate() + n); return x; }

	/* Easter Sunday (Gregorian), for the Lent challenge */
	function easter(y) {
		var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
			f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
			i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
			month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
		return new Date(y, month - 1, day);
	}

	/* ---------- Badge catalog ---------- */

	// Tiered counts. value() names the number each one tracks.
	var MILESTONES = [
		{ id: 'readings', title: 'Readings', icon: 'book', tiers: [1, 10, 50, 100, 250, 500, 1000], unit: ['reading', 'readings'],
			text: 'Mark readings as read.' },
		{ id: 'streak', title: 'Reading Streak', icon: 'flame', tiers: [3, 7, 14, 30, 60, 100, 365], unit: ['day', 'days'],
			text: 'Read on days in a row. Days off in your plans don’t break it.' },
		{ id: 'visits', title: 'Visit Streak', icon: 'sun', tiers: [3, 7, 30, 100, 365], unit: ['day', 'days'],
			text: 'Open the app days in a row.' },
		{ id: 'started', title: 'Plans Started', icon: 'flag', tiers: [1, 3, 5, 10, 25], unit: ['plan', 'plans'],
			text: 'Start a reading plan.' },
		{ id: 'finished', title: 'Plans Finished', icon: 'myplan', tiers: [1, 3, 5, 10, 25], unit: ['plan', 'plans'],
			text: 'Finish every reading in a plan.' },
		{ id: 'shared', title: 'Shared Plans', icon: 'share', tiers: [1, 5, 10, 25], unit: ['link', 'links'],
			text: 'Copy a plan’s link to share it.' }
	];

	// Dated, once a year: read on `goal` days inside the window
	var CHALLENGES = [
		{ id: 'feb21', title: 'February 21', mark: '21', goal: 21,
			text: 'Read on 21 days in February.',
			window: function (y) { return [new Date(y, 1, 1), new Date(y, 2, 0)]; } },
		{ id: 'lent', title: 'Lent to Easter', icon: 'dawn', goal: 40,
			text: 'Read on 40 days from Ash Wednesday to Easter Sunday.',
			window: function (y) { var e = easter(y); return [addDays(e, -46), e]; } },
		{ id: 'advent', title: 'Advent', icon: 'star', goal: 20,
			text: 'Read on 20 days from December 1 to Christmas Day.',
			window: function (y) { return [new Date(y, 11, 1), new Date(y, 11, 25)]; } }
	];

	var CUSTOM = { id: 'custom', title: 'Your Own Plan', blurb: 'Finish a plan you built or customized.' };

	/* ---------- Store ---------- */

	function create(opts) {
		opts = opts || {};
		var storage = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
		var now = opts.now || function () { return new Date(); };
		var catalogPlans = [];   // the shell's ready-made plans: { id, title, art, blurb }
		var data, migrating = false;

		function todayKey() { return ymd(now()); }

		function blank() {
			return { v: 1, since: todayKey(), visits: [], marks: {}, started: {}, finished: {}, shares: 0,
				earned: {}, readWeekdays: ALL_WEEK.slice() };
		}

		function load() {
			var raw = null;
			try { raw = JSON.parse(storage.getItem(KEY)); } catch (e) {}
			if (raw && raw.v === 1) {
				data = blank();
				for (var k in raw) data[k] = raw[k];
				return;
			}
			data = blank();
			migrating = true;
			// readings checked before this existed: counted, but with no date (so no streak days)
			try {
				for (var i = 0; i < storage.length; i++) {
					var key = storage.key(i);
					if (isProgressKey(key) && storage.getItem(key) === 'true') data.marks[key] = '';
				}
			} catch (e) {}
		}

		function save() { try { storage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

		/* ---------- Recording ---------- */

		function visit() {
			var t = todayKey();
			if (data.visits.indexOf(t) > -1) return false;
			data.visits.push(t);
			data.visits.sort();
			save();
			return true;
		}

		/* A reading checked (or unchecked). A reading keeps the day it was first checked;
		   unchecking forgets it, so Undo takes back that day's streak credit too. */
		function markRead(key, done) {
			if (!isProgressKey(key)) return;
			if (done) { if (!(key in data.marks)) data.marks[key] = todayKey(); }
			else delete data.marks[key];
			save();
		}

		function noteShare() { data.shares = (data.shares || 0) + 1; save(); }

		/* ---------- Derived numbers ---------- */

		function readDays() {
			var out = {};
			for (var k in data.marks) { var d = data.marks[k]; if (d) out[d] = (out[d] || 0) + 1; }
			return out;
		}

		function isRest(d) { return data.readWeekdays.indexOf(d.getDay()) < 0; }

		// Count back from today. Today only counts once it's done; until then the streak runs to yesterday.
		function readingStreak() {
			var days = readDays(), t = strip(now()), readToday = !!days[ymd(t)], d = readToday ? t : addDays(t, -1), n = 0;
			for (var i = 0; i < 5000; i++, d = addDays(d, -1)) {
				if (days[ymd(d)]) n++;
				else if (!isRest(d)) break;
			}
			return { current: n, best: Math.max(n, longestRun(days, isRest)), readToday: readToday, restToday: isRest(t) };
		}

		function visitStreak() {
			var set = {}, t = strip(now()), n = 0, d;
			data.visits.forEach(function (v) { set[v] = true; });
			d = set[ymd(t)] ? t : addDays(t, -1);
			for (var i = 0; i < 5000 && set[ymd(d)]; i++, d = addDays(d, -1)) n++;
			return { current: n, best: Math.max(n, longestRun(set, function () { return false; })) };
		}

		/* Longest run in the whole history, worked out fresh each time (never stored),
		   so unchecking a reading takes back the best as well as the current streak */
		function longestRun(set, rest) {
			var keys = Object.keys(set).sort(), best = 0, run = 0;
			if (!keys.length) return 0;
			for (var d = parse(keys[0]), end = strip(now()), i = 0; d <= end && i < 20000; d = addDays(d, 1), i++) {
				if (set[ymd(d)]) { run++; if (run > best) best = run; }
				else if (!rest(d)) run = 0;
			}
			return best;
		}

		// Sunday-to-Saturday weeks with a reading, back from this one (still open, so it can't break the run)
		function weeksInARow() {
			var days = readDays(), t = strip(now()), w = addDays(t, -t.getDay()), n = 0;
			function has(start) { for (var i = 0; i < 7; i++) if (days[ymd(addDays(start, i))]) return true; return false; }
			if (!has(w)) w = addDays(w, -7);
			for (var i = 0; i < 800 && has(w); i++, w = addDays(w, -7)) n++;
			return n;
		}

		function daysReadIn(year) {
			var n = 0, prefix = year + '-';
			for (var d in readDays()) if (d.indexOf(prefix) === 0) n++;
			return n;
		}

		function week() {
			var days = readDays(), visits = {}, t = strip(now()), start = addDays(t, -t.getDay()), out = [];
			data.visits.forEach(function (v) { visits[v] = true; });
			for (var i = 0; i < 7; i++) {
				var d = addDays(start, i), k = ymd(d);
				out.push({ date: d, key: k, read: !!days[k], visited: !!visits[k], rest: isRest(d), today: k === ymd(t), future: d > t });
			}
			// was last week's run still going into Sunday? (back over any days off)
			var b = addDays(start, -1);
			for (var j = 0; j < 7 && !days[ymd(b)] && isRest(b); j++) b = addDays(b, -1);
			var before = !!days[ymd(b)];
			// days off between two reading days stay part of the run
			out.forEach(function (day, i) {
				day.chain = day.read;
				if (day.read || !day.rest || day.future) return;
				var l = i - 1, r = i + 1;
				while (l >= 0 && !out[l].read && out[l].rest) l--;
				while (r < 7 && !out[r].read && out[r].rest) r++;
				day.chain = (l >= 0 ? out[l].read : before) && r < 7 && out[r].read;
			});
			out.carried = before && out[0].chain;
			return out;
		}

		function values() {
			return {
				readings: Object.keys(data.marks).length,
				streak: readingStreak().best,
				visits: visitStreak().best,
				started: Object.keys(data.started).length,
				finished: Object.keys(data.finished).length,
				shared: data.shares || 0
			};
		}

		/* ---------- Challenges ---------- */

		function challengeYear(c, year) {
			var w = c.window(year), start = w[0], end = w[1], t = strip(now()), days = readDays(), count = 0, total = 0, left = 0;
			for (var d = start; d <= end; d = addDays(d, 1)) {
				total++;
				if (days[ymd(d)]) count++;
				else if (d >= t) left++;   // days still to come (today included while it's unread)
			}
			var earnedOn = data.earned[c.id + ':' + year] || null, status;
			if (earnedOn) status = 'earned';
			else if (t < start) status = 'upcoming';
			else if (t > end) status = 'missed';
			else status = count + left >= c.goal ? 'active' : 'out';
			return { year: year, start: start, end: end, count: count, goal: c.goal, total: total, left: left, status: status, earnedOn: earnedOn };
		}

		// The window to show: this year's while it's ahead or open, else next year's
		function challengeNow(c) {
			var y = now().getFullYear(), s = challengeYear(c, y);
			if (strip(now()) > s.end) return challengeYear(c, y + 1);
			return s;
		}

		function challengeYears(c) {
			var out = [];
			for (var k in data.earned) if (k.indexOf(c.id + ':') === 0) out.push(+k.slice(c.id.length + 1));
			return out.sort(function (a, b) { return b - a; });
		}

		/* ---------- Plans ---------- */

		function planBadgeId(planId) {
			return catalogPlans.some(function (p) { return p.id === planId; }) ? planId : 'custom';
		}

		function finishes(badgePlanId) {
			var out = [];
			for (var id in data.finished) {
				var f = data.finished[id];
				if (planBadgeId(f.plan) === badgePlanId) out.push({ entryId: id, on: f.on, name: f.name });
			}
			return out.sort(function (a, b) { return (b.on || '').localeCompare(a.on || ''); });
		}

		/* ---------- Sync: record plans, award badges ---------- */

		/* plans: [{ id, planId, name, done, total, weekdays: [0-6] }] for every plan being followed.
		   Returns the badges earned by this call (see describe()). */
		function sync(plans) {
			var t = todayKey(), fresh = [];
			plans = plans || [];

			// a day is a reading day when any followed plan reads on that weekday
			var wd = {};
			plans.forEach(function (p) { (p.weekdays && p.weekdays.length ? p.weekdays : ALL_WEEK).forEach(function (n) { wd[n] = true; }); });
			data.readWeekdays = plans.length ? Object.keys(wd).map(Number).sort() : ALL_WEEK.slice();

			plans.forEach(function (p) {
				if (!(p.id in data.started)) data.started[p.id] = migrating ? '' : t;
				if (p.total > 0 && p.done >= p.total && !data.finished[p.id]) {
					data.finished[p.id] = { on: t, plan: p.planId || '', name: p.name || '' };
				}
			});

			function award(id) { if (!data.earned[id]) { data.earned[id] = t; fresh.push(id); } }

			var v = values();
			MILESTONES.forEach(function (m) { m.tiers.forEach(function (n) { if (v[m.id] >= n) award(m.id + ':' + n); }); });
			for (var id in data.finished) award('plan:' + planBadgeId(data.finished[id].plan));
			var y = now().getFullYear();
			CHALLENGES.forEach(function (c) {
				[y - 1, y].forEach(function (yr) { if (challengeYear(c, yr).count >= c.goal) award(c.id + ':' + yr); });
			});

			var wasMigrating = migrating;
			migrating = false;
			save();
			return fresh.map(function (id) { var b = describe(id); b.backfilled = wasMigrating; return b; });
		}

		/* ---------- For the UI ---------- */

		// One earned badge id ("readings:10", "plan:year", "feb21:2027") as something to show
		function describe(id) {
			var parts = id.split(':'), group = parts[0], arg = parts[1];
			if (group === 'plan') {
				var p = arg === 'custom' ? CUSTOM : catalogPlans.filter(function (x) { return x.id === arg; })[0] || CUSTOM;
				return { id: id, kind: 'plan', badge: 'plan:' + (p === CUSTOM ? 'custom' : p.id), title: p.title, label: p.title, art: p.art || null };
			}
			var c = CHALLENGES.filter(function (x) { return x.id === group; })[0];
			if (c) return { id: id, kind: 'challenge', badge: 'challenge:' + c.id, title: c.title, label: c.title + ' · ' + arg, year: +arg };
			var m = MILESTONES.filter(function (x) { return x.id === group; })[0];
			return { id: id, kind: 'milestone', badge: 'milestone:' + group, title: m ? m.title : group, label: (m ? m.title : group) + ' · ' + arg, tier: +arg };
		}

		function milestone(m, v) {
			var tiers = m.tiers.map(function (n) { return { n: n, on: data.earned[m.id + ':' + n] || null }; });
			var reached = tiers.filter(function (x) { return x.on; }), next = tiers.filter(function (x) { return !x.on; })[0] || null;
			return { kind: 'milestone', id: m.id, key: 'milestone:' + m.id, title: m.title, text: m.text, icon: m.icon, unit: m.unit,
				value: v[m.id], level: reached.length ? reached[reached.length - 1].n : null, next: next ? next.n : null, tiers: tiers,
				earned: reached.length > 0 };
		}

		function catalog() {
			var v = values();
			return {
				challenges: CHALLENGES.map(function (c) {
					var years = challengeYears(c);
					return { kind: 'challenge', id: c.id, key: 'challenge:' + c.id, title: c.title, text: c.text, icon: c.icon || null, mark: c.mark || null,
						goal: c.goal, now: challengeNow(c), years: years, earned: years.length > 0 };
				}),
				milestones: MILESTONES.map(function (m) { return milestone(m, v); }),
				plans: catalogPlans.concat([CUSTOM]).map(function (p) {
					var list = finishes(p.id);
					return { kind: 'plan', id: p.id, key: 'plan:' + p.id, title: p.title, art: p.art || null, finishes: list, earned: list.length > 0,
						text: p === CUSTOM ? p.blurb : 'Finish every reading in ' + p.title + '.' };
				})
			};
		}

		function find(key) {
			var c = catalog(), all = c.challenges.concat(c.milestones, c.plans);
			return all.filter(function (b) { return b.key === key; })[0] || null;
		}

		function stats() {
			var t = now();
			return { reading: readingStreak(), visit: visitStreak(), weeks: weeksInARow(), year: t.getFullYear(),
				yearDays: daysReadIn(t.getFullYear()), week: week(), since: parse(data.since) };
		}

		function earnedCount() { return Object.keys(data.earned).length; }

		load();

		return {
			setPlans: function (list) { catalogPlans = list || []; },
			visit: visit,
			markRead: markRead,
			noteShare: noteShare,
			sync: sync,
			stats: stats,
			catalog: catalog,
			find: find,
			describe: describe,
			earnedCount: earnedCount,
			isFirstRun: function () { return migrating; },
			_data: function () { return data; }
		};
	}

	// app.js progress keys: start|total|order|logic|days|books|psalm|proverb then -<day index>
	function isProgressKey(key) { return typeof key === 'string' && key.split('|').length === 8 && /-\d+$/.test(key); }

	return { create: create, ymd: ymd, parse: parse, addDays: addDays, easter: easter, MILESTONES: MILESTONES, CHALLENGES: CHALLENGES };
});
