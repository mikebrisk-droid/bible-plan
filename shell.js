/* Read the Bible — app shell
   Owns navigation, the Home / Plans / Create / My plan screens, sheets and motion.
   The plan engine (app.js, plans.js, renderers.js) still reads its settings from the
   hidden #engine form; this file only writes to that form through loadFromParams(). */
(function () {
	'use strict';

	var doc = document;
	var g = window.gsap;
	var motionOK = !!g && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function $q(sel, root) { return (root || doc).querySelector(sel); }
	function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
	function icon(name) { return '<svg class="icon"><use href="#i-' + name + '"/></svg>'; }
	function esc(v) {
		return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	var store = {
		get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
		set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
	};
	function isRead(key) { try { return localStorage.getItem(key) === 'true'; } catch (e) { return false; } }
	function setRead(key, value) { try { localStorage.setItem(key, value ? 'true' : 'false'); } catch (e) {} }

	/* ---------- Dates & labels ---------- */

	function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
	function ymd(d) { return d.toInputField(); }
	function parseYmd(s) {
		var p = String(s || '').split('-');
		return p.length === 3 ? new Date(+p[0], p[1] - 1, +p[2]) : null;
	}
	function fmt(d, opts) { return d.toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric' }); }
	function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

	function durationLabel(total) {
		total = +total;
		if (total === 365 || total === 366) return '1 year';
		if (total === 730) return '2 years';
		if (total === 182 || total === 183) return '6 months';
		return total + ' days';
	}

	var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	function daysLabel(dow) {
		dow = String(dow || '');
		if (dow === '1,2,3,4,5,6,7') return 'Every day';
		if (dow === '2,3,4,5,6') return 'Weekdays';
		if (dow === '2,3,4,5,6,7') return 'Sundays off';
		if (dow === '1,2,3,4,5,6') return 'Saturdays off';
		return dow.split(',').filter(Boolean).map(function (n) { return DAY_NAMES[n - 1].slice(0, 3); }).join(', ');
	}

	/* ---------- Ready-made plans ---------- */

	var PLANS = [
		{ id: 'year', title: 'Bible in a Year', blurb: 'Genesis to Revelation, a little every day.', art: 'sun', tags: 'whole',
			params: { total: 365, order: 'traditional', books: 'OT,NT', logic: 'words' } },
		{ id: 'chrono', title: 'Chronological Bible', blurb: 'The whole story, in the order it happened.', art: 'timeline', tags: 'whole',
			params: { total: 365, order: 'chronological', books: 'OT,NT', logic: 'chapters' } },
		{ id: 'mcheyne', title: 'M’Cheyne Plan', blurb: 'Four short readings a day from across Scripture.', art: 'four', tags: 'whole',
			params: { total: 365, order: 'mcheyne', books: 'OT,NT', logic: 'chapters' } },
		{ id: 'nt90', title: 'New Testament in 90 Days', blurb: 'Matthew to Revelation in three months.', art: 'cross', tags: 'nt',
			params: { total: 90, order: 'traditional', books: 'NT', logic: 'words' } },
		{ id: 'ntweek', title: 'New Testament on Weekdays', blurb: 'About a chapter a day, weekends off.', art: 'dots', tags: 'nt',
			params: { total: 365, order: 'traditional', books: 'NT', logic: 'chapters', daysofweek: '2,3,4,5,6' } },
		{ id: 'gospels', title: 'The Four Gospels', blurb: 'The life of Jesus, told four ways.', art: 'quad', tags: 'nt',
			params: { total: 60, order: 'traditional', books: 'MAT,MRK,LUK,JHN', logic: 'pericopes' } },
		{ id: 'john', title: 'John in 40 Days', blurb: 'One Gospel, one story at a time.', art: 'rays', tags: 'nt',
			params: { total: 40, order: 'traditional', books: 'JHN', logic: 'pericopes' } },
		{ id: 'psalms', title: 'Psalms & Proverbs', blurb: 'Songs and wisdom over two months.', art: 'waves', tags: 'ot',
			params: { total: 60, order: 'traditional', books: 'PSA,PRO', logic: 'words' } },
		{ id: 'otstory', title: 'Old Testament Story', blurb: 'The Old Testament in order, over six months.', art: 'mountain', tags: 'ot',
			params: { total: 182, order: 'chronological', books: 'OT', logic: 'chapters' } },
		{ id: 'genesis', title: 'Genesis in 30 Days', blurb: 'Creation, promise and one unlikely family.', art: 'seed', tags: 'ot',
			params: { total: 30, order: 'traditional', books: 'GEN', logic: 'chapters' } },
		{ id: 'torah', title: 'The Torah', blurb: 'The five books of Moses in three months.', art: 'tablets', tags: 'ot',
			params: { total: 90, order: 'traditional', books: 'GEN,EXO,LEV,NUM,DEU', logic: 'words' } },
		{ id: 'david', title: 'The Stories of David', blurb: 'Shepherd to king, with the psalms he wrote along the way.', art: 'crown', tags: 'ot',
			params: { total: 40, order: 'list', books: 'david', logic: 'chapters' } },
		{ id: 'paul', title: 'Paul’s Journey', blurb: 'Acts and Paul’s letters, in the order they happened.', art: 'scroll', tags: 'nt',
			params: { total: 60, order: 'list', books: 'paul', logic: 'words' } },
		{ id: 'endtimes', title: 'The End Times', blurb: 'Daniel to Revelation on the last days and the world to come.', art: 'flame', tags: 'nt',
			params: { total: 40, order: 'list', books: 'endtimes', logic: 'chapters' } },
		{ id: 'easter', title: 'The Road to Easter', blurb: 'Forty days to the cross and the empty tomb.', art: 'tomb', tags: 'nt',
			params: { total: 40, order: 'list', books: 'easter', logic: 'chapters' } },
		{ id: 'christmas', title: 'The Road to Christmas', blurb: 'Twenty-five days from the first promise to the manger.', art: 'branch', tags: 'nt',
			params: { total: 25, order: 'list', books: 'christmas', logic: 'chapters' } }
	];
	/* order 'list' plans read a fixed chapter list (bible.plans.lists); the builder names them by their plan */
	function listTitle(name) { var p = PLANS.filter(function (x) { return x.params.order === 'list' && x.params.books === name; })[0]; return p ? p.title : 'Reading list'; }
	PLANS.forEach(function (p) { if (p.params.total <= 90) p.tags += ' short'; });
	function planById(id) { return PLANS.filter(function (p) { return p.id === id; })[0]; }

	var FILTERS = [['all', 'All'], ['whole', 'Whole Bible'], ['ot', 'Old Testament'], ['nt', 'New Testament'], ['short', '3 months or less']];

	/* Plan covers: one .webp per art key. Sets: assets/plans/ (glow), assets/plans-paper/ (paper cut) */
	var COVER_SET = 'assets/plans-paper/';
	function cover(art) {
		return '<img src="' + COVER_SET + (art || 'sun') + '.webp" alt="" width="284" height="284" decoding="async">';
	}

	/* ---------- Plan math (uses the engine directly, without touching the form) ---------- */

	var BASE = { total: 365, order: 'traditional', books: 'OT,NT', logic: 'words', daysofweek: '1,2,3,4,5,6,7', dailypsalm: '0', dailyproverb: '0', otntoverlap: '0', reverse: '0' };

	function withDefaults(p) {
		var out = {}, k;
		for (k in BASE) out[k] = BASE[k];
		for (k in p) if (p[k] != null) out[k] = String(p[k]);
		if (!out.start) out.start = ymd(today());
		return out;
	}

	function expandBooks(order, books) {
		var list = String(books || '').split(',').filter(Boolean);
		if (order === 'chronological' || order === 'list') return list;
		if (order === 'mcheyne') return [];
		var groups = order === 'alternate' ? { OT: bible.TANAKH_BOOKS, NT: bible.GOSPEL_BOOKS } : { OT: bible.OT_BOOKS, DC: bible.DC_BOOKS, NT: bible.NT_BOOKS };
		var out = [];
		list.forEach(function (b) { out = out.concat(groups[b] || [b]); });
		return out;
	}

	var statCache = {};
	function planStats(params) {
		var p = withDefaults(params), key = JSON.stringify(p);
		if (statCache[key]) return statCache[key];
		var data;
		try {
			data = getPlanData('en', p.order, parseYmd(p.start) || today(), parseInt(p.total, 10),
				expandBooks(p.order, p.books),
				p.daysofweek.split(',').filter(Boolean).map(function (n) { return n - 1; }),
				p.dailypsalm === '1', p.dailyproverb === '1', p.otntoverlap === '1', p.reverse === '1', p.logic, false, 'biblegateway', 'NIV');
		} catch (e) {
			return null;
		}
		var readings = data.days.filter(function (d) { return d.formattedReading; });
		var words = 0, verses = 0;
		readings.forEach(function (d) { words += d.wordsForToday || 0; verses += d.versesForToday || 0; });
		var perDay = readings.length ? (words || verses * 26) / readings.length : 0;
		var result = { readings: readings.length, minutes: Math.max(1, Math.round(perDay / 230)), first: readings[0] ? readings[0].formattedReading : '' };
		statCache[key] = result;
		return result;
	}

	function minutesOf(day) {
		var words = day.wordsForToday || (day.versesForToday || 0) * 26;
		return Math.max(1, Math.round(words / 230));
	}

	/* ---------- Active plan ---------- */

	/* Someone can follow several plans at once (say, a personal one and their church's).
	   mine.list holds them all; state.active is the one the engine has loaded (shown on My plan).
	   Reading progress is already keyed by each plan's settings (app.js currentKey), so plans
	   keep their own checkmarks. The old single-plan key is migrated on first load. */
	var PLANS_KEY = 'rtb-plans', ACTIVE_KEY = 'rtb-active-plan';
	function newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
	var mine = (function () {
		var m = store.get(PLANS_KEY);
		if (m && Array.isArray(m.list)) {
			// plans saved while the form couldn't hold a reading list lost it (order=undefined, no books): they can never show a reading
			var kept = m.list.filter(function (e) { return new URLSearchParams(e.query || '').get('order') !== 'undefined'; });
			if (kept.length !== m.list.length) { m.list = kept; store.set(PLANS_KEY, m); }
			return m;
		}
		m = { list: [], current: null };
		var old = store.get(ACTIVE_KEY);
		if (old && old.query) { old.id = newId(); m.list.push(old); m.current = old.id; }
		return m;
	})();
	function findPlan(id) { return mine.list.filter(function (e) { return e.id === id; })[0] || null; }
	var state = { view: null, active: findPlan(mine.current) || mine.list[0] || null, filter: 'all' };

	function displayPrefs() {
		function on(id) { var el = doc.getElementById(id); return el && el.checked ? '1' : '0'; }
		var format = $q('input[name=formatstyle]:checked');
		return {
			format: format ? format.value : 'list',
			lang: $q('#options-language').value || 'en',
			checkbox: on('options-checkbox'),
			colors: on('options-sectioncolors'),
			stats: on('options-stats'),
			dailystats: on('options-dailystats'),
			nodates: on('options-nodates'),
			includeurls: on('options-includeurls'),
			urlsite: $q('#options-urlsite').value,
			urlversion: $q('#options-urlversion').value
		};
	}

	function toQuery(params, display) {
		var p = withDefaults(params), d = display || displayPrefs(), q = new URLSearchParams();
		['start', 'total', 'order', 'books', 'logic', 'daysofweek', 'dailypsalm', 'dailyproverb', 'otntoverlap', 'reverse'].forEach(function (k) { q.set(k, p[k]); });
		Object.keys(d).forEach(function (k) { q.set(k, d[k]); });
		return q;
	}

	function saveActive() {
		mine.current = state.active ? state.active.id : null;
		store.set(PLANS_KEY, mine);
	}

	/* Adds a plan and makes it current, or (meta.replace) rewrites the current one, as Edit does */
	function startPlan(params, meta, display) {
		var q = toQuery(params, display);
		var fields = { query: '?' + q.toString(), name: meta.name, named: !!meta.named, planId: meta.planId || null };
		var adding = !(meta.replace && state.active);
		if (adding) { state.active = { id: newId() }; mine.list.push(state.active); }
		for (var k in fields) state.active[k] = fields[k];
		saveActive();
		loadFromParams(q);
		if (location.hash !== '#plan') location.hash = 'plan';
		else renderPlanView();
		toast(meta.toast || (adding && mine.list.length > 1 ? 'Plan added' : 'Plan started'));
	}

	function switchPlan(id) {
		var e = findPlan(id);
		if (!e || e === state.active) return false;
		state.active = e;
		saveActive();
		loadFromParams(new URLSearchParams(e.query));
		return true;
	}

	function removePlan(id) {
		var e = findPlan(id);
		if (!e) return;
		mine.list.splice(mine.list.indexOf(e), 1);
		if (e === state.active) {
			state.active = mine.list[0] || null;
			if (state.active) loadFromParams(new URLSearchParams(state.active.query));
			else history.replaceState(null, '', location.pathname + location.hash);
		}
		saveActive();
		renderView(state.view);
		toast('Plan removed');
	}

	/* The parts of a plan's query that decide its days; joined the same way as app.js currentKey */
	var KEY_FIELDS = ['start', 'total', 'order', 'logic', 'daysofweek', 'books', 'dailypsalm', 'dailyproverb'];
	function keyOf(query) {
		var q = new URLSearchParams(query);
		return KEY_FIELDS.map(function (k) { return q.get(k) || ''; }).join('|');
	}

	/* Days and progress-key prefix for any plan. The current one comes from the engine; the others
	   are built with the same engine call (as planStats does) and cached by query. */
	var ctxCache = {};
	function ctxFor(entry) {
		if (!entry || entry === state.active) return { days: planDays(), key: window.currentKey };
		if (ctxCache[entry.query]) return ctxCache[entry.query];
		var q = new URLSearchParams(entry.query), order = q.get('order'), days = [];
		try {
			days = getPlanData(q.get('lang') || 'en', order, parseYmd(q.get('start')) || today(), parseInt(q.get('total'), 10),
				expandBooks(order, q.get('books')),
				(q.get('daysofweek') || '').split(',').filter(Boolean).map(function (n) { return n - 1; }),
				q.get('dailypsalm') === '1', q.get('dailyproverb') === '1', q.get('otntoverlap') === '1', q.get('reverse') === '1',
				q.get('logic'), q.get('includeurls') === '1', q.get('urlsite') || 'biblegateway', q.get('urlversion') || 'NIV').days;
		} catch (err) { days = []; }
		return (ctxCache[entry.query] = { days: days, key: keyOf(entry.query) });
	}

	window.onPlanQuery = function (query) {
		if (!state.active) return;
		if (state.active.named && state.active.name) query += '&name=' + encodeURIComponent(state.active.name);
		state.active.query = query;
		saveActive();
		history.replaceState(null, '', location.pathname + query + location.hash);
	};

	function planName() {
		if (state.active && state.active.name) return state.active.name;
		return String(window.currentTitle || 'My plan').split(' - ')[0];
	}
	function entryName(e) { return e === state.active ? planName() : e.name || 'Reading plan'; }

	function currentParams() { return new URLSearchParams(window.currentQuery || ''); }

	function planDays() { return window.lastPlanDays || []; }

	function progress(ctx) {
		ctx = ctx || ctxFor();
		var total = 0, done = 0;
		ctx.days.forEach(function (d, i) {
			if (!d.formattedReading) return;
			total++;
			if (isRead(ctx.key + '-' + i)) done++;
		});
		return { total: total, done: done, pct: total ? Math.round(done / total * 100) : 0 };
	}

	function todayInfo(ctx) {
		ctx = ctx || ctxFor();
		var days = ctx.days, t = today(), n = 0, info = { status: 'none', behind: 0 };
		if (!days.length) return info;
		var first = days[0].date, last = days[days.length - 1].date;
		for (var i = 0; i < days.length; i++) {
			var d = days[i];
			if (!d.formattedReading) continue;
			n++;
			var dd = new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate());
			if (dd < t && !isRead(ctx.key + '-' + i)) info.behind++;
			if (sameDay(dd, t)) { info.status = 'today'; info.index = i; info.dayNumber = n; }
			else if (dd > t && info.next == null) { info.next = i; }
		}
		info.totalReadings = n;
		if (info.status === 'today') return info;
		if (t < new Date(first.getFullYear(), first.getMonth(), first.getDate())) info.status = 'upcoming';
		else if (t > last) info.status = 'done';
		else info.status = 'rest';
		return info;
	}

	function readingButton(day, cls, label) {
		var match = day.formattedReadingUrls && day.formattedReadingUrls.match(/href="([^"]+)"/);
		var refs = day.chapters.map(function (c) { return c.usfm + '.' + c.chapter; }).join(',');
		return '<button type="button" class="' + cls + ' reading-open" data-reading-url="' + esc(match ? match[1] : '') +
			'" data-reading-title="' + esc(day.formattedReading) + '" data-reading-refs="' + esc(refs) + '">' + label + '</button>';
	}

	/* ---------- Sheets ---------- */

	var sheets = window.lampSheet = {
		open: function (el) {
			if (el.getAttribute('aria-hidden') === 'false') return;
			var panel = $q('.sheet-panel', el), backdrop = $q('.sheet-backdrop', el), phone = window.innerWidth < 700;
			el._returnFocus = doc.activeElement;
			el.setAttribute('aria-hidden', 'false');
			doc.body.classList.add('has-sheet');
			if (motionOK) {
				g.killTweensOf([panel, backdrop]);
				g.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' });
				if (phone) g.fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' });
				else g.fromTo(panel, { y: 28, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out' });
				g.from($$('.sheet-body > *', el), { y: 14, opacity: 0, duration: 0.45, stagger: 0.04, delay: 0.1, ease: 'power2.out', clearProps: 'transform,opacity' });
			}
			setTimeout(function () {
				var target = $q('.sheet-close, #reading-modal-close', el) || panel;
				target.focus({ preventScroll: true });
			}, 40);
		},
		close: function (el, done) {
			if (el.getAttribute('aria-hidden') !== 'false') { if (done) done(); return; }
			var panel = $q('.sheet-panel', el), backdrop = $q('.sheet-backdrop', el), phone = window.innerWidth < 700;
			function finish() {
				el.setAttribute('aria-hidden', 'true');
				if (g) g.set([panel, backdrop], { clearProps: 'all' });
				if (!$q('.sheet[aria-hidden="false"]')) doc.body.classList.remove('has-sheet');
				if (el._returnFocus && el._returnFocus.focus) el._returnFocus.focus({ preventScroll: true });
				if (done) done();
			}
			if (!motionOK) return finish();
			g.to(backdrop, { opacity: 0, duration: 0.25 });
			if (phone) g.to(panel, { yPercent: 100, duration: 0.35, ease: 'power3.in', onComplete: finish });
			else g.to(panel, { y: 16, scale: 0.98, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: finish });
		}
	};

	function closeSheet(el) {
		if (el.id === 'reading-modal') { $q('#reading-modal-close').click(); return; }
		sheets.close(el);
	}

	/* ---------- Toast ---------- */

	var toastEl = $q('.toast'), toastTimer;
	function toast(message) {
		toastEl.textContent = message;
		clearTimeout(toastTimer);
		if (motionOK) {
			g.killTweensOf(toastEl);
			g.fromTo(toastEl, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' });
			g.to(toastEl, { opacity: 0, y: 8, duration: 0.3, delay: 2.2 });
		} else {
			toastEl.style.opacity = 1;
			toastTimer = setTimeout(function () { toastEl.style.opacity = 0; }, 2400);
		}
	}

	/* ---------- Home ---------- */

	function greeting() {
		var h = new Date().getHours();
		return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
	}

	function ringHtml(pct) {
		return '<div class="ring" data-pct="' + pct + '" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="ring-track" cx="50" cy="50" r="42"/>' +
			'<circle class="ring-fill" cx="50" cy="50" r="42" stroke-dasharray="263.9" stroke-dashoffset="263.9"/></svg>' +
			'<div class="ring-label"><span class="ring-num">0%</span><small>read</small></div></div>';
	}

	function animateRing(ring, from) {
		if (!ring) return;
		var pct = +ring.dataset.pct, fill = $q('.ring-fill', ring), num = $q('.ring-num', ring), C = 263.9;
		if (!motionOK) {
			fill.setAttribute('stroke-dashoffset', C * (1 - pct / 100));
			num.textContent = pct + '%';
			return;
		}
		var counter = { v: from == null ? 0 : from };
		g.to(fill, { attr: { 'stroke-dashoffset': C * (1 - pct / 100) }, duration: 1.2, ease: 'power3.out', delay: from == null ? 0.25 : 0 });
		g.to(counter, { v: pct, duration: 1.2, ease: 'power3.out', delay: from == null ? 0.25 : 0, onUpdate: function () { num.textContent = Math.round(counter.v) + '%'; } });
	}

	// each plan's card gets the next hero art in turn; six in all (see .today-card[data-art])
	var HERO_ARTS = 6;
	function todayCard(entry, index) {
		var ctx = ctxFor(entry), info = todayInfo(ctx), days = ctx.days, chip, ref, meta = '', actions;
		var toPlan = 'href="#plan" data-switch-plan="' + entry.id + '"';
		if (info.status === 'today') {
			var day = days[info.index], key = ctx.key + '-' + info.index, done = isRead(key);
			chip = '<span class="chip">Day ' + info.dayNumber + ' of ' + info.totalReadings + '</span>';
			ref = esc(day.formattedReading);
			meta = icon('clock') + '<span>' + minutesOf(day) + ' min read</span>';
			actions = readingButton(day, 'btn btn-primary btn-lg', icon('book') + '<span>Read</span>') +
				'<button type="button" class="btn btn-ghost btn-lg js-mark' + (done ? ' is-done' : '') + '" data-key="' + esc(key) + '">' +
				(done ? icon('check') + '<span>Done</span>' : '<span>Mark as read</span>') + '</button>';
		} else if (info.status === 'rest' || info.status === 'upcoming') {
			var next = info.next != null ? days[info.next] : null;
			chip = '<span class="chip">' + (info.status === 'rest' ? 'Rest day' : 'Starts ' + fmt(next ? next.date : new Date(), { weekday: 'short', month: 'short', day: 'numeric' })) + '</span>';
			ref = next ? esc(next.formattedReading) : '';
			meta = next ? icon('calendar') + '<span>Next reading · ' + fmt(next.date, { weekday: 'long' }) + '</span>' : '';
			actions = '<a class="btn btn-primary btn-lg" ' + toPlan + '>' + icon('myplan') + '<span>View plan</span></a>';
		} else {
			chip = '<span class="chip">Complete</span>';
			ref = 'You finished the plan.';
			actions = '<a class="btn btn-primary btn-lg" href="#plans">Find your next plan</a>';
		}
		if (info.behind > 0 && info.status !== 'done') {
			chip += '<a class="chip chip-accent" ' + toPlan + '>' + info.behind + ' to catch up</a>';
		}
		return '<article class="today-card" data-anim data-plan-id="' + entry.id + '" data-art="' + ((index || 0) % HERO_ARTS) + '">' +
			'<div class="today-top">' + chip + '<a class="today-plan muted" ' + toPlan + '>' + esc(entryName(entry)) + '</a></div>' +
			'<div><h2 class="today-ref">' + ref + '</h2>' + (meta ? '<p class="today-meta muted">' + meta + '</p>' : '') + '</div>' +
			ringHtml(progress(ctx).pct) +
			'<div class="today-actions">' + actions + '</div></article>';
	}

	function entryForTemplate(id) { return mine.list.filter(function (e) { return e.planId === id; })[0] || null; }

	function planCard(p) {
		var entry = entryForTemplate(p.id), badge = !entry ? '' : entry === state.active ? 'Current' : 'Started';
		return '<button type="button" class="plan-card" data-plan="' + p.id + '" data-tags="' + p.tags + '">' +
			'<span class="cover">' + cover(p.art) + '</span>' +
			'<span class="plan-card-body"><strong>' + esc(p.title) + '</strong>' +
			'<span class="meta" data-meta="' + p.id + '">' + durationLabel(p.params.total) + '</span>' +
			(badge ? '<span class="badge">' + badge + '</span>' : '') + '</span></button>';
	}

	function renderHome() {
		var el = $q('#view-home'), html = '';
		html += '<header class="greeting" data-anim><div><span class="eyebrow">' + fmt(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }) + '</span><h1>' + greeting() + '</h1></div>' +
			(state.active ? '<a class="btn greeting-action" href="#create" data-new-plan aria-label="New plan">' + icon('create') + '<span>New plan</span></a>' : '') + '</header>';

		if (state.active) {
			var cards = [state.active].concat(mine.list.filter(function (e) { return e !== state.active; })).map(todayCard);
			html += cards.length > 1 ? '<div class="today-grid">' + cards.join('') + '</div>' : cards[0];
		} else {
			html += '<section class="section"><div class="section-head" data-anim><h2>Start here</h2></div><div class="start-grid">' +
				'<button type="button" class="start-card is-featured" data-plan="year"><span class="start-icon">' + icon('book') + '</span><span class="start-text"><strong>Bible in a Year</strong><small>The classic, one year</small></span></button>' +
				'<a class="start-card" href="#plans"><span class="start-icon">' + icon('plans') + '</span><span class="start-text"><strong>Choose a plan</strong><small>' + PLANS.length + ' ready-made plans</small></span></a>' +
				'<a class="start-card" href="#create"><span class="start-icon">' + icon('create') + '</span><span class="start-text"><strong>Build your own</strong><small>Your books, your pace</small></span></a>' +
				'</div></section>';
		}

		html += '<section class="section"><div class="section-head" data-anim><h2>Popular plans</h2><a class="link-btn" href="#plans">See all ' + icon('arrow') + '</a></div>' +
			'<div class="shelf">' + PLANS.slice(0, 5).map(planCard).join('') + '</div></section>';

		el.innerHTML = html;
		fillEstimates(el);
	}

	/* ---------- Plans ---------- */

	function renderPlans() {
		var el = $q('#view-plans');
		el.innerHTML = '<header class="view-head" data-anim><h1>Plans</h1></header>' +
			'<div class="chips" role="toolbar" aria-label="Filter plans" data-anim>' +
			FILTERS.map(function (f) { return '<button type="button" class="filter" data-filter="' + f[0] + '" aria-pressed="' + (state.filter === f[0]) + '">' + f[1] + '</button>'; }).join('') +
			'</div><div class="plan-grid">' + PLANS.map(planCard).join('') + '</div>';
		applyFilter(state.filter, false);
		fillEstimates(el);
	}

	function applyFilter(filter, animate) {
		state.filter = filter;
		$$('#view-plans .filter').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filter === filter)); });
		var shown = [];
		$$('#view-plans .plan-card').forEach(function (card) {
			var match = filter === 'all' || (' ' + card.dataset.tags + ' ').indexOf(' ' + filter + ' ') > -1;
			card.hidden = !match;
			if (match) shown.push(card);
		});
		if (animate && motionOK) {
			g.fromTo(shown, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity' });
		}
	}

	/* Fill "~N min a day" one card at a time so the page never stalls */
	function fillEstimates(root) {
		var targets = $$('[data-meta]', root), i = 0;
		(function next() {
			var el = targets[i++];
			if (!el) return;
			var plan = planById(el.dataset.meta), stats = planStats(plan.params);
			if (stats) el.textContent = durationLabel(plan.params.total) + ' · ' + stats.minutes + ' min a day';
			setTimeout(next, 16);
		})();
	}

	/* ---------- Plan detail sheet ---------- */

	var sheetPlan = null;

	function openPlanSheet(id) {
		var p = planById(id), sheet = $q('#plan-sheet');
		if (!p) return;
		sheetPlan = p;
		var isCurrent = !!entryForTemplate(p.id);
		$q('#plan-sheet-cover').innerHTML = cover(p.art);
		$q('#plan-sheet-title').textContent = p.title;
		$q('#plan-sheet-blurb').textContent = p.blurb;
		$q('#plan-sheet-facts').innerHTML =
			'<li>' + icon('calendar') + durationLabel(p.params.total) + '</li>' +
			'<li data-fact="min">' + icon('clock') + '…</li>' +
			'<li>' + icon('check') + daysLabel(p.params.daysofweek || BASE.daysofweek) + '</li>';
		$q('#plan-sheet-first').innerHTML = '';
		$q('#plan-sheet-start').textContent = isCurrent ? 'Continue plan' : 'Start today';
		$q('#plan-sheet-note').textContent = '';
		sheets.open(sheet);

		setTimeout(function () {
			var stats = planStats(p.params);
			if (!stats || sheetPlan !== p) return;
			$q('[data-fact="min"]', sheet).innerHTML = icon('clock') + stats.minutes + ' min a day';
			var first = $q('#plan-sheet-first');
			first.innerHTML = '<small>Day 1</small><strong>' + esc(stats.first) + '</strong>';
			if (motionOK) g.from(first, { opacity: 0, y: 8, duration: 0.35, ease: 'power2.out' });
		}, 60);
	}

	/* ---------- Builder: every control from the original generator sidebar, in five steps ---------- */

	var STEPS = [
		{ label: 'Time', title: 'Time frame' },
		{ label: 'Format', title: 'Format' },
		{ label: 'Books', title: 'Bible books' },
		{ label: 'Days', title: 'Days of the week' },
		{ label: 'Options', title: 'Options' }
	];
	var LAST = STEPS.length - 1;
	var FLAGS = ['checkbox', 'colors', 'dailypsalm', 'dailyproverb', 'otntoverlap', 'reverse', 'nodates', 'stats', 'dailystats', 'includeurls'];
	var DC_LIST = bible.DC_BOOKS.filter(function (u) { return bible.BIBLE_DATA[u]; });
	var B;

	function resetBuilder() {
		B = {
			step: 0, start: ymd(today()), total: 365,
			format: 'list', lang: ($q('#options-language') || {}).value || 'en',
			order: 'traditional', scope: 'whole', books: [], altBooks: bible.TANAKH_BOOKS.slice(), list: '', logic: 'words',
			days: [1, 2, 3, 4, 5, 6, 7],
			checkbox: true, colors: true, dailypsalm: false, dailyproverb: false, otntoverlap: false, reverse: false,
			nodates: false, stats: false, dailystats: false, includeurls: false,
			urlsite: 'biblegateway', urlversion: 'NIV',
			name: '', customStart: false, customTotal: false
		};
	}
	resetBuilder();

	/* Load any query (a template, the active plan, a shared link) into the builder; missing keys keep defaults. */
	function builderFrom(params) {
		function get(k) { var v = params.get ? params.get(k) : params[k]; return v == null ? null : String(v); }
		resetBuilder();
		if (get('order')) B.order = get('order') === 'tanakh' ? 'alternate' : get('order');
		var books = (get('books') || 'OT,NT').split(',').filter(Boolean);
		if (B.order === 'list') {
			B.list = books[0] || '';
		} else if (B.order === 'alternate') {
			B.altBooks = expandBooks('alternate', books.join(','));
		} else if (B.order === 'chronological') {
			B.scope = books.indexOf('OT') > -1 && books.indexOf('NT') > -1 ? 'whole' : books.indexOf('NT') > -1 ? 'NT' : 'OT';
		} else {
			var joined = books.join(',');
			if (joined === 'OT,NT') B.scope = 'whole';
			else if (joined === 'OT' || joined === 'NT') B.scope = joined;
			else { B.scope = 'custom'; B.books = expandBooks('traditional', joined); }
		}
		if (parseYmd(get('start'))) B.start = get('start');
		if (parseInt(get('total'), 10) > 0) B.total = parseInt(get('total'), 10);
		if (get('daysofweek')) B.days = get('daysofweek').split(',').filter(Boolean).map(Number);
		['logic', 'format', 'lang', 'urlsite', 'urlversion'].forEach(function (k) { if (get(k)) B[k] = get(k); });
		if (B.format === 'pdf' || HIDDEN_FORMATS.indexOf(B.format) > -1) B.format = 'calendar';
		FLAGS.forEach(function (k) { if (get(k) != null) B[k] = get(k) === '1'; });
	}

	var CANON = [].concat(bible.OT_BOOKS, bible.DC_BOOKS, bible.NT_BOOKS);
	var ALT = [].concat(bible.TANAKH_BOOKS, bible.GOSPEL_BOOKS);
	function sortBy(list, order) { return list.slice().sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); }); }
	function hasAll(list, group) { return group.every(function (u) { return list.indexOf(u) > -1; }); }

	function booksParam() {
		if (B.order === 'mcheyne') return 'OT,NT';
		if (B.order === 'list') return B.list;
		if (B.order === 'chronological') return B.scope === 'whole' ? 'OT,NT' : B.scope;
		if (B.order === 'alternate') {
			var out = [];
			[['OT', bible.TANAKH_BOOKS], ['NT', bible.GOSPEL_BOOKS]].forEach(function (pair) {
				if (hasAll(B.altBooks, pair[1])) out.push(pair[0]);
				else out = out.concat(sortBy(B.altBooks.filter(function (u) { return pair[1].indexOf(u) > -1; }), pair[1]));
			});
			return out.join(',');
		}
		if (B.scope === 'custom') return sortBy(B.books, CANON).join(',');
		return B.scope === 'whole' ? 'OT,NT' : B.scope;
	}

	function builderParams() {
		var p = {
			start: B.start, total: B.total, order: B.order, books: booksParam(), logic: B.logic,
			daysofweek: B.days.slice().sort().join(',')
		};
		['dailypsalm', 'dailyproverb', 'otntoverlap', 'reverse'].forEach(function (k) { p[k] = B[k] ? '1' : '0'; });
		return p;
	}

	function builderDisplay() {
		var d = { format: B.format, lang: B.lang, urlsite: B.urlsite, urlversion: B.urlversion };
		['checkbox', 'colors', 'stats', 'dailystats', 'nodates', 'includeurls'].forEach(function (k) { d[k] = B[k] ? '1' : '0'; });
		return d;
	}

	function bookName(usfm) { return bible.getName(bible.BIBLE_DATA[usfm], 'en'); }

	function builderName() {
		if (B.order === 'mcheyne') return 'M’Cheyne Plan';
		if (B.order === 'list') return listTitle(B.list);
		if (B.order === 'alternate') {
			var t = hasAll(B.altBooks, bible.TANAKH_BOOKS), gw = hasAll(B.altBooks, bible.GOSPEL_BOOKS);
			if (t && gw) return 'Tanakh & Gospel Writers';
			if (t && B.altBooks.length === bible.TANAKH_BOOKS.length) return 'Hebrew Tanakh';
			if (gw && B.altBooks.length === bible.GOSPEL_BOOKS.length) return 'Gospel Writers';
		}
		var scope = { whole: 'Whole Bible', OT: 'Old Testament', NT: 'New Testament' }[B.scope];
		if (B.order === 'chronological') return 'Chronological ' + (B.scope === 'whole' ? 'Bible' : scope);
		if (B.order === 'traditional' && scope) return scope;
		var books = B.order === 'alternate' ? sortBy(B.altBooks, ALT) : sortBy(B.books, CANON);
		if (!books.length) return 'Choose some books';
		if (books.length <= 3) return books.map(bookName).join(', ').replace(/, ([^,]*)$/, ' & $1');
		return books.length + ' books';
	}

	function bookProblem() {
		if (B.order === 'alternate') return !B.altBooks.length;
		return B.order === 'traditional' && B.scope === 'custom' && !B.books.length;
	}
	function builderValid() { return B.days.length > 0 && B.total > 0 && !!parseYmd(B.start) && !bookProblem(); }

	function pills(name, options, value) {
		return '<div class="pill-row">' + options.map(function (o) {
			return '<button type="button" class="pill" data-' + name + '="' + o[0] + '" aria-pressed="' + (String(value) === String(o[0])) + '">' + o[1] + '</button>';
		}).join('') + '</div>';
	}

	/* Format-style choice boxes for the Time and Books steps: art on top (a date, a big number or a
	   line drawing like LAYOUT_ART), a short label below. `cols` is the column count on phones. */
	function choiceBox(attr, value, pressed, art, label) {
		return '<button type="button" class="layout-choice box-choice" data-' + attr + '="' + value + '" aria-pressed="' + pressed + '">' +
			'<span class="box-art" aria-hidden="true">' + art + '</span><span class="box-label">' + label + '</span></button>';
	}
	function boxGrid(boxes, cols) { return '<div class="box-grid"' + (cols ? ' style="--cols:' + cols + '"' : '') + '>' + boxes.join('') + '</div>'; }
	function lineArt(paths) { return '<svg viewBox="0 0 48 42">' + paths + '</svg>'; }
	function countArt(n, unit) { return '<b>' + n + '</b><small>' + unit + '</small>'; }

	var ORDERS = [
		['traditional', 'Traditional', '<path d="M6 11c5-2.5 12-2.5 18 1.5 6-4 13-4 18-1.5v22c-5-2.5-12-2.5-18 1.5-6-4-13-4-18-1.5z"/><path d="M24 12.5v22"/>'],
		['chronological', 'Chronological', '<path d="M6 21h36"/><circle cx="13" cy="21" r="3"/><circle cx="24" cy="21" r="3"/><circle cx="35" cy="21" r="3"/><path d="M13 9v6M24 27v6M35 9v6"/>'],
		['alternate', 'Alternate', '<path d="M6 11h13M29 17h13M6 23h13M29 29h13"/><path d="m21 12 6 4M27 18l-6 4M21 24l6 4"/>'],
		['mcheyne', 'M’Cheyne', '<circle cx="9" cy="10" r="2"/><circle cx="9" cy="17" r="2"/><circle cx="9" cy="24" r="2"/><circle cx="9" cy="31" r="2"/><path d="M15 10h26M15 17h20M15 24h24M15 31h16"/>']
	];
	// a plan built from a fixed list keeps that list as a fifth order, so it can be picked again after trying another
	function orderChoices() {
		return B.list ? ORDERS.concat([['list', listTitle(B.list), '<path d="M14 11h26M14 19h26M14 27h26M14 35h18"/><circle cx="8" cy="11" r="2"/><circle cx="8" cy="19" r="2"/><circle cx="8" cy="27" r="2"/><circle cx="8" cy="35" r="2"/>']]) : ORDERS;
	}
	var LOGICS = [
		['chapters', 'Chapters', 'The same number of chapters every day.',
			'<rect x="6" y="10" width="10" height="22" rx="2"/><rect x="19" y="10" width="10" height="22" rx="2"/><rect x="32" y="10" width="10" height="22" rx="2"/>'],
		['words', 'Words', 'Whole chapters, balanced so each day is about the same length.',
			'<path d="M8 11h32M8 17h32M8 23h32M8 29h32M8 35h18"/>'],
		['pericopes', 'Pericopes', 'Days end at natural story breaks, sometimes mid-chapter.',
			'<path d="M8 9h32M8 14h32M8 19h20"/><path d="M8 26h32M8 31h32M8 36h24"/><circle cx="36" cy="19" r="2"/>']
	];
	function logicNote() { var l = LOGICS.filter(function (x) { return x[0] === B.logic; })[0]; return l ? l[2] : ''; }
	function paintCustomBooks() {
		var art = $q('[data-scope="custom"] .box-art');
		if (art) art.innerHTML = customBooksArt();
	}
	function popBoxArt(target) {
		var box = typeof target === 'string' ? $q(target, $q('#view-create')) : target;
		if (motionOK && box) g.fromTo($q('.box-art', box), { scale: 0.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
	}
	function customBooksArt() { return B.books.length ? countArt(B.books.length, B.books.length === 1 ? 'book' : 'books') : icon('edit'); }

	/* Time frame boxes: a calendar-style date or a big number where the Format step has its layout art */
	function dateArt(d) { return '<small>' + fmt(d, { month: 'short' }) + '</small><b>' + d.getDate() + '</b>'; }
	function lengthArt(n) {
		var named = { 182: ['6', 'months'], 365: ['1', 'year'], 730: ['2', 'years'] }[n] || [String(n), n === 1 ? 'day' : 'days'];
		return '<b>' + named[0] + '</b><small>' + named[1] + '</small>';
	}
	function endsOn(n) {
		var s = parseYmd(B.start);
		return s && n > 0 ? 'Ends ' + fmt(s.addDays(n - 1), { month: 'short', day: 'numeric' }) : '';
	}
	// refresh the parts of the Time frame boxes that depend on the start date or a custom value
	function paintTimeBoxes() {
		var view = $q('#view-create'), cs = $q('[data-custom="start"]', view), ct = $q('[data-custom="total"]', view);
		if (!cs || !ct) return;
		$q('.box-art', cs).innerHTML = B.customStart && parseYmd(B.start) ? dateArt(parseYmd(B.start)) : icon('calendar');
		$$('[data-total]', view).forEach(function (b) { $q('.box-label', b).textContent = endsOn(+b.dataset.total); });
		$q('.box-art', ct).innerHTML = B.customTotal ? lengthArt(B.total) : icon('edit');
		$q('.box-label', ct).textContent = B.customTotal ? endsOn(B.total) : 'Custom';
	}

	function bookGroup(key, label, list, selected, attr) {
		return '<div class="book-group"><div class="book-group-head"><strong>' + label + '</strong>' +
			'<button type="button" class="link-btn" data-group-all="' + key + '">All / none</button></div><div class="book-chips">' +
			list.map(function (u) { return '<button type="button" class="book-chip" data-' + attr + '="' + u + '" aria-pressed="' + (selected.indexOf(u) > -1) + '">' + esc(bookName(u)) + '</button>'; }).join('') +
			'</div></div>';
	}

	function toggleRow(key, label, hint) {
		return '<label class="row"><span>' + label + (hint ? '<small>' + hint + '</small>' : '') + '</span>' +
			'<input type="checkbox" class="switch" data-opt="' + key + '"' + (B[key] ? ' checked' : '') + '></label>';
	}

	function selectFrom(id, sourceId, value) {
		var src = doc.getElementById(sourceId);
		return '<select id="' + id + '">' + (src ? src.innerHTML : '') + '</select>';
	}

	var LAYOUT_ART = {
		matrix: '<rect x="6" y="8" width="36" height="26" rx="3"/><path d="M6 15h36M6 21.5h36M6 28h36M17 8v26"/><path d="M22 11.5h8M22 18h14M22 24.5h10M22 31h12"/>',
		sections: '<path d="M8 10h12M8 15h20M8 19h16M8 26h12M8 31h18"/><circle cx="36" cy="12" r="3"/><circle cx="36" cy="28" r="3"/>',
		progress: '<path d="M8 12h10M8 21h10M8 30h10"/><rect x="22" y="10" width="20" height="4" rx="2"/><rect x="22" y="19" width="14" height="4" rx="2"/><rect x="22" y="28" width="8" height="4" rx="2"/>',
		board: '<rect x="5" y="8" width="11" height="26" rx="2.5"/><rect x="18.5" y="8" width="11" height="26" rx="2.5"/><rect x="32" y="8" width="11" height="26" rx="2.5"/><path d="M8 13h5M8 18h5M21.5 13h5M35 13h5M35 18h5M35 23h5"/>',
		weekrows: '<rect x="6" y="8" width="36" height="26" rx="3"/><path d="M6 16.5h36M6 25h36M15 8v26"/><path d="M19 12.3h4M26 12.3h4M33 12.3h4M19 20.8h4M26 20.8h4M19 29.3h4"/>',
		habit: '<rect x="6" y="8" width="7" height="7" rx="2"/><rect x="16" y="8" width="7" height="7" rx="2"/><rect x="26" y="8" width="7" height="7" rx="2"/><rect x="36" y="8" width="7" height="7" rx="2"/><rect x="6" y="18" width="7" height="7" rx="2"/><rect x="16" y="18" width="7" height="7" rx="2"/><rect x="26" y="18" width="7" height="7" rx="2"/><rect x="6" y="28" width="7" height="7" rx="2"/><rect x="16" y="28" width="7" height="7" rx="2"/><path d="m27.5 21.5 1.5 1.5 3-3"/>',
		calendar: '<rect x="6" y="8" width="36" height="26" rx="3"/><path d="M6 15h36M18 15v19M30 15v19M6 24.5h36"/>',
		list: '<path d="M8 11h4M16 11h24M8 19h4M16 19h20M8 27h4M16 27h22"/>',
		weeks: '<rect x="6" y="8" width="16" height="26" rx="3"/><rect x="26" y="8" width="16" height="26" rx="3"/><path d="M10 15h8M10 21h8M10 27h6M30 15h8M30 21h8M30 27h6"/>',
		books: '<rect x="6" y="9" width="12" height="6" rx="2"/><rect x="21" y="9" width="8" height="6" rx="2"/><rect x="32" y="9" width="10" height="6" rx="2"/><rect x="6" y="18" width="16" height="6" rx="2"/><rect x="25" y="18" width="17" height="6" rx="2"/><rect x="6" y="27" width="9" height="6" rx="2"/><rect x="18" y="27" width="12" height="6" rx="2"/>',
		circle: '<circle cx="24" cy="21" r="14"/><path d="M24 7v28M10 21h28M14 11l20 20M34 11 14 31"/>',
		circlecal: '<circle cx="24" cy="21" r="14"/><circle cx="24" cy="21" r="9"/><circle cx="24" cy="21" r="4"/>'
	};
	// The wheel layouts (circle, circlecal) are hidden for now; plans that use them open in Calendar
	var HIDDEN_FORMATS = ['circle', 'circlecal'];
	var LAYOUTS = [['calendar', 'Calendar'], ['list', 'List'], ['weeks', 'Weeks'], ['books', 'Books'],
		['matrix', 'Matrix'], ['sections', 'Sections'], ['progress', 'Progress'], ['board', 'Board'], ['weekrows', 'Week rows'], ['habit', 'Habit']];
	// layouts whose totals, statuses or columns depend on what's checked; they re-render on every check
	var LIVE_FORMATS = ['matrix', 'sections', 'progress', 'board', 'weekrows', 'habit'];

	function nextMonday() { var d = today(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d; }
	function nextMonthFirst() { var d = today(); return new Date(d.getFullYear(), d.getMonth() + 1, 1); }
	function nextJan1() { var d = today(); return new Date(d.getFullYear() + 1, 0, 1); }

	function endLabel() {
		var s = parseYmd(B.start);
		return s && B.total > 0 ? 'Ends ' + fmt(s.addDays(B.total - 1), { month: 'short', day: 'numeric', year: 'numeric' }) : '';
	}

	function stepHtml() {
		var h = '<h2>' + STEPS[B.step].title + '</h2>';

		if (B.step === 0) {
			var starts = [['Today', today()], ['Next Monday', nextMonday()], ['Next month', nextMonthFirst()], ['New Year', nextJan1()]];
			var totals = [30, 90, 182, 365, 730];
			// "Custom" is on when chosen, or when the value (e.g. from an edited plan) matches no preset
			B.customStart = B.customStart || !starts.some(function (s) { return ymd(s[1]) === B.start; });
			B.customTotal = B.customTotal || totals.indexOf(B.total) < 0;
			h += '<div class="field"><span class="field-label">Start</span>' +
				boxGrid(starts.map(function (s) { return choiceBox('start', ymd(s[1]), !B.customStart && B.start === ymd(s[1]), dateArt(s[1]), s[0]); })
					.concat(choiceBox('custom', 'start', B.customStart, '', 'Custom'))) +
				'<label class="inline-field" id="b-start-field"' + (B.customStart ? '' : ' hidden') + '><input class="input" type="date" id="b-start" aria-label="Start date" value="' + B.start + '"></label></div>' +
				'<div class="field"><span class="field-label">Days</span>' +
				boxGrid(totals.map(function (n) { return choiceBox('total', n, !B.customTotal && B.total === n, lengthArt(n), ''); })
					.concat(choiceBox('custom', 'total', B.customTotal, '', ''))) +
				'<label class="inline-field" id="b-total-field"' + (B.customTotal ? '' : ' hidden') + '><input class="input input-days" type="number" min="1" max="3650" id="b-total" value="' + B.total + '"> days</label></div>';

		} else if (B.step === 1) {
			h += '<div class="field"><span class="field-label">Layout</span><div class="layout-grid">' + LAYOUTS.map(function (l) {
				return '<button type="button" class="layout-choice" data-format="' + l[0] + '" aria-pressed="' + (B.format === l[0]) + '">' +
					'<svg viewBox="0 0 48 42" aria-hidden="true">' + LAYOUT_ART[l[0]] + '</svg><span>' + l[1] + '</span></button>';
			}).join('') + '</div></div>' +
				'<div class="rows"><label class="row"><span>Language</span>' + selectFrom('b-lang', 'options-language') + '</label></div>' +
				'<p class="fine">Print, iCal and CSV are under My plan → Save.</p>';

		} else if (B.step === 2) {
			h += '<div class="field"><span class="field-label">Order</span>' +
				boxGrid(orderChoices().map(function (o) { return choiceBox('order', o[0], B.order === o[0], lineArt(o[2]), o[1]); }), 2) + '</div>';
			if (B.order === 'traditional' || B.order === 'chronological') {
				var scopes = [['whole', 'Whole Bible', countArt(66, 'books')], ['OT', 'Old Testament', countArt(39, 'books')], ['NT', 'New Testament', countArt(27, 'books')]];
				if (B.order === 'traditional') scopes.push(['custom', 'Choose books', customBooksArt()]);
				h += '<div class="field"><span class="field-label">Books</span>' +
					boxGrid(scopes.map(function (c) { return choiceBox('scope', c[0], B.scope === c[0], c[2], c[1]); }), scopes.length === 4 ? 2 : 3) + '</div>';
				if (B.order === 'traditional' && B.scope === 'custom') {
					h += '<div class="field book-picker">' +
						bookGroup('OT', 'Old Testament', bible.OT_BOOKS, B.books, 'book') +
						bookGroup('DC', 'Deuterocanonical', DC_LIST, B.books, 'book') +
						bookGroup('NT', 'New Testament', bible.NT_BOOKS, B.books, 'book') + '</div>';
				}
			} else if (B.order === 'alternate') {
				h += '<div class="field book-picker">' +
					bookGroup('TANAKH', 'Hebrew Tanakh', bible.TANAKH_BOOKS, B.altBooks, 'alt-book') +
					bookGroup('GOSPEL', 'Gospel Writers', bible.GOSPEL_BOOKS, B.altBooks, 'alt-book') + '</div>';
			}
			h += '<div class="field"><span class="field-label">Divide by</span>' +
				boxGrid(LOGICS.map(function (l) { return choiceBox('logic', l[0], B.logic === l[0], lineArt(l[3]), l[1]); }), 3) +
				'<p class="box-note" id="logic-note">' + logicNote() + '</p></div>';

		} else if (B.step === 3) {
			h += '<div class="field"><div class="weekdays">' + DAY_NAMES.map(function (n, i) {
				return '<button type="button" class="weekday" data-day="' + (i + 1) + '" aria-label="' + n + '" aria-pressed="' + (B.days.indexOf(i + 1) > -1) + '">' + n[0] + '</button>';
			}).join('') + '</div></div>' +
				'<div class="field"><span class="field-label">Quick picks</span>' +
				pills('days', [['1,2,3,4,5,6,7', 'Every day'], ['2,3,4,5,6', 'Weekends off'], ['2,3,4,5,6,7', 'Sundays off'], ['1,2,3,4,5,6', 'Saturdays off']], B.days.slice().sort().join(',')) + '</div>';

		} else {
			h += '<div class="field"><label class="field-label" for="b-name">Plan name</label>' +
				'<input class="input input-name" id="b-name" type="text" maxlength="60" autocomplete="off" placeholder="' + esc(builderName()) + '" value="' + esc(B.name) + '"></div>';
			h += '<span class="field-label">Reading</span><div class="rows">' +
				toggleRow('dailypsalm', 'Daily Psalm') + toggleRow('dailyproverb', 'Daily Proverb') +
				toggleRow('otntoverlap', 'OT/NT overlap', 'Read from both testaments each day') + toggleRow('reverse', 'Reverse') + '</div>' +
				'<span class="field-label">Display</span><div class="rows">' +
				toggleRow('checkbox', 'Include checkbox') + toggleRow('colors', 'Section colors') + toggleRow('nodates', 'Remove dates') +
				toggleRow('stats', 'Show overall stats') + toggleRow('dailystats', 'Show daily stats') + '</div>' +
				'<span class="field-label">Links</span><div class="rows">' + toggleRow('includeurls', 'Add reading links') +
				'<label class="row"><span>Bible site</span>' + selectFrom('b-urlsite', 'options-urlsite') + '</label>' +
				'<label class="row" id="b-version-row"' + (B.urlsite === 'yallversion' ? ' hidden' : '') + '><span>Translation</span>' + selectFrom('b-urlversion', 'options-urlversion') + '</label>' +
				'</div>';
		}
		return h;
	}

	/* With a plan running, the Create tab first asks: start fresh or edit the current one.
	   null = ask; 'new' / 'edit' / 'template' = straight to the builder. Cleared on leaving the view. */
	var createMode = null;

	/* One plan: "Edit Current Plan". Several: a card per plan, so each can be edited on its own. */
	function chooserHtml() {
		function editCard(e, title, sub) {
			return '<button type="button" class="start-card" data-create-mode="edit" data-edit-plan-id="' + e.id + '"><span class="start-icon">' + icon('edit') + '</span>' +
				'<span class="start-text"><strong>' + esc(title) + '</strong><small>' + esc(sub) + '</small></span></button>';
		}
		var edits = mine.list.length > 1
			? mine.list.map(function (e) { return editCard(e, entryName(e), 'Edit · ' + durationLabel(new URLSearchParams(e.query).get('total'))); })
			: [editCard(state.active, 'Edit Current Plan', planName())];
		return '<div class="builder create-choice"><div class="start-grid">' +
			'<button type="button" class="start-card start-hero" data-create-mode="new"><span class="start-icon">' + icon('create') + '</span>' +
			'<span class="start-text"><strong>Create a New Plan</strong><small>Start from scratch</small></span></button>' +
			edits.join('') + '</div></div>';
	}

	function chooseCreateMode(mode, planId) {
		if (mode === 'edit') {
			// editing works on the loaded plan, so open the chosen one first (saving keeps it current anyway)
			if (planId) switchPlan(planId);
			builderFrom(currentParams());
			if (state.active && state.active.name) B.name = state.active.name;
		} else {
			resetBuilder();
		}
		createMode = mode;
		renderCreate();
		if (motionOK) g.fromTo($$('[data-anim]', $q('#view-create')), { y: 18, opacity: 0 },
			{ y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' });
	}

	function renderCreate() {
		var el = $q('#view-create');
		if (state.active && !createMode) { el.innerHTML = chooserHtml(); return; }
		if (!$q('.builder:not(.create-choice)', el)) {
			el.innerHTML = '<div class="builder">' +
				'<ol class="stepper" data-anim>' + STEPS.map(function (s, i) {
					return '<li><button type="button" data-goto="' + i + '"><span class="bar"><span></span></span><span class="lbl">' + s.label + '</span></button></li>';
				}).join('') + '</ol>' +
				'<section class="step" id="step-body" aria-live="polite"></section>' +
				'<div class="builder-bar" data-anim><div class="summary"><strong id="sum-title"></strong><span id="sum-meta"></span></div>' +
				'<button type="button" class="btn btn-quiet" id="step-back">' + icon('back') + '<span>Back</span></button>' +
				'<button type="button" class="btn btn-primary btn-lg" id="step-next">Next</button></div></div>';
		}
		renderStep(0);
	}

	function renderStep(direction) {
		var body = $q('#step-body');
		body.innerHTML = stepHtml();
		var lang = $q('#b-lang'), site = $q('#b-urlsite'), version = $q('#b-urlversion');
		if (lang) lang.value = B.lang;
		if (site) site.value = B.urlsite;
		if (version) version.value = B.urlversion;

		$q('#step-back').style.visibility = B.step === 0 ? 'hidden' : 'visible';
		$q('#step-next').textContent = B.step < LAST ? 'Next' : createMode === 'edit' ? 'Save plan' : 'Create plan';
		$$('.stepper button').forEach(function (b, i) {
			if (i === B.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
			var bar = $q('.bar span', b), w = i <= B.step ? '100%' : '0%';
			if (motionOK) g.to(bar, { width: w, duration: 0.5, ease: 'power3.out' }); else bar.style.width = w;
		});
		if (motionOK && direction) {
			g.fromTo(body, { x: 36 * direction, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
			g.from($$('.field, .rows, .field-label', body), { y: 14, opacity: 0, duration: 0.45, stagger: 0.05, delay: 0.08, ease: 'power2.out', clearProps: 'transform,opacity' });
		}
		updateSummary();
	}

	function goStep(n) {
		if (n === B.step || n < 0 || n > LAST) return;
		var dir = n > B.step ? 1 : -1;
		B.step = n;
		renderStep(dir);
		window.scrollTo({ top: 0, behavior: motionOK ? 'smooth' : 'auto' });
	}

	function rerenderStep(revealSelector) {
		renderStep(0);
		if (revealSelector && motionOK) {
			var el = $q(revealSelector);
			if (el) g.from(el.children, { y: 12, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', clearProps: 'transform,opacity' });
		}
	}

	var summaryTimer, shownMinutes = null;
	function planTitle() { return B.name.trim() || builderName(); }

	function updateSummary() {
		$q('#sum-title').textContent = planTitle();
		paintTimeBoxes();
		var nameInput = $q('#b-name');
		if (nameInput) nameInput.placeholder = builderName();
		var next = $q('#step-next'), meta = $q('#sum-meta'), end = $q('#b-end');
		if (end) end.textContent = endLabel();
		if (!builderValid()) {
			meta.textContent = !B.days.length ? 'Pick at least one day' : bookProblem() ? 'Pick at least one book' : 'Check the start date and days';
			next.disabled = B.step === LAST;
			return;
		}
		next.disabled = false;
		var base = durationLabel(B.total) + ' · ' + daysLabel(B.days.slice().sort().join(','));
		meta.textContent = base;
		clearTimeout(summaryTimer);
		summaryTimer = setTimeout(function () {
			var stats = planStats(builderParams());
			if (!stats) return;
			var from = shownMinutes == null ? stats.minutes : shownMinutes, counter = { v: from };
			shownMinutes = stats.minutes;
			function paint() { meta.textContent = base + ' · ' + Math.round(counter.v) + ' min a day'; }
			if (motionOK && from !== stats.minutes) g.to(counter, { v: stats.minutes, duration: 0.6, ease: 'power2.out', onUpdate: paint });
			else { counter.v = stats.minutes; paint(); }
		}, 180);
	}

	function setPressed(selector, match) {
		$$(selector, $q('#view-create')).forEach(function (el) { el.setAttribute('aria-pressed', String(match(el))); });
	}

	function bindBuilder() {
		var view = $q('#view-create');

		view.addEventListener('click', function (e) {
			var t = e.target.closest('button');
			if (!t || !view.contains(t)) return;
			var d = t.dataset;

			if (d.createMode) return chooseCreateMode(d.createMode, d.editPlanId);
			if (t.id === 'step-next') {
				if (B.step < LAST) goStep(B.step + 1);
				else if (builderValid()) startPlan(builderParams(), { name: planTitle(), named: !!B.name.trim(), toast: createMode === 'edit' ? 'Plan updated' : null, replace: createMode === 'edit' }, builderDisplay());
				return;
			}
			if (t.id === 'step-back') return goStep(B.step - 1);
			if (d.goto) return goStep(+d.goto);

			if (d.start || d.total) {
				var which = d.start ? 'start' : 'total';
				if (d.start) B.start = d.start; else B.total = +d.total;
				B[which === 'start' ? 'customStart' : 'customTotal'] = false;
				$q('#b-' + which).value = B[which];
				$q('#b-' + which + '-field').hidden = true;
				setPressed('[data-' + which + '], [data-custom="' + which + '"]', function (p) { return p === t; });
				if (motionOK) g.fromTo($q('.box-art', t), { scale: 0.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
				return updateSummary();
			}
			if (d.custom) {
				var field = $q('#b-' + d.custom + '-field'), input = $q('#b-' + d.custom);
				B[d.custom === 'start' ? 'customStart' : 'customTotal'] = true;
				setPressed('[data-' + d.custom + '], [data-custom="' + d.custom + '"]', function (p) { return p === t; });
				paintTimeBoxes();
				if (motionOK) g.fromTo($q('.box-art', t), { scale: 0.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
				if (field.hidden) {
					field.hidden = false;
					if (motionOK) g.from(field, { y: -6, opacity: 0, duration: 0.35, ease: 'power2.out', clearProps: 'transform,opacity' });
				}
				input.focus();
				if (d.custom === 'start') { try { input.showPicker(); } catch (err) { /* not supported */ } }
				else input.select();
				return;
			}
			if (d.format) {
				B.format = d.format;
				if (B.format === 'circle' || B.format === 'books') B.colors = true;
				setPressed('[data-format]', function (p) { return p === t; });
				if (motionOK) g.fromTo($q('svg', t), { scale: 0.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
				return;
			}
			if (d.order) {
				B.order = d.order;
				if (B.order === 'chronological' && B.scope === 'custom') B.scope = 'whole';
				if (B.order === 'mcheyne') B.logic = 'chapters';
				rerenderStep(B.order === 'alternate' ? '.book-picker' : null);
				return popBoxArt('[data-order="' + B.order + '"]');
			}
			if (d.scope) {
				B.scope = d.scope;
				rerenderStep(d.scope === 'custom' ? '.book-picker' : null);
				return popBoxArt('[data-scope="' + B.scope + '"]');
			}
			if (d.book || d.altBook) {
				var list = d.book ? B.books : B.altBooks, code = d.book || d.altBook, i = list.indexOf(code);
				if (i > -1) list.splice(i, 1); else list.push(code);
				t.setAttribute('aria-pressed', String(i < 0));
				if (motionOK) g.fromTo(t, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
				paintCustomBooks();
				return updateSummary();
			}
			if (d.groupAll) {
				var groups = { OT: bible.OT_BOOKS, NT: bible.NT_BOOKS, DC: DC_LIST, TANAKH: bible.TANAKH_BOOKS, GOSPEL: bible.GOSPEL_BOOKS };
				var group = groups[d.groupAll], key = d.groupAll === 'TANAKH' || d.groupAll === 'GOSPEL' ? 'altBooks' : 'books';
				var allOn = hasAll(B[key], group);
				B[key] = B[key].filter(function (u) { return group.indexOf(u) < 0; });
				if (!allOn) B[key] = B[key].concat(group);
				$$('.book-chip', t.closest('.book-group')).forEach(function (c) { c.setAttribute('aria-pressed', String(!allOn)); });
				paintCustomBooks();
				return updateSummary();
			}
			if (d.logic) {
				B.logic = d.logic;
				setPressed('[data-logic]', function (p) { return p === t; });
				$q('#logic-note').textContent = logicNote();
				if (motionOK) g.fromTo('#logic-note', { y: 4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out', clearProps: 'transform,opacity' });
				popBoxArt(t);
				return updateSummary();
			}
			if (d.day) {
				var n = +d.day, j = B.days.indexOf(n);
				if (j > -1) B.days.splice(j, 1); else B.days.push(n);
				t.setAttribute('aria-pressed', String(j < 0));
				if (motionOK) g.fromTo(t, { scale: 0.85 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
				syncDayPills();
				return updateSummary();
			}
			if (d.days) {
				B.days = d.days.split(',').map(Number);
				$$('.weekday', view).forEach(function (w, k) { w.setAttribute('aria-pressed', String(B.days.indexOf(k + 1) > -1)); });
				if (motionOK) g.fromTo($$('.weekday', view), { scale: 0.9 }, { scale: 1, duration: 0.4, stagger: 0.03, ease: 'back.out(3)' });
				syncDayPills();
				return updateSummary();
			}
		});

		view.addEventListener('input', function (e) {
			var t = e.target;
			if (t.id === 'b-name') {
				B.name = t.value;
				$q('#sum-title').textContent = planTitle();
				return;
			}
			if (t.id === 'b-total') {
				var v = parseInt(t.value, 10);
				if (v > 0) {
					B.total = Math.min(v, 3650);
					updateSummary();
				}
			}
			if (t.id === 'b-start' && parseYmd(t.value)) {
				B.start = t.value;
				updateSummary();
			}
		});

		view.addEventListener('keydown', function (e) {
			if (e.target.id === 'b-name' && e.key === 'Enter') { e.preventDefault(); $q('#step-next').click(); }
		});

		view.addEventListener('change', function (e) {
			var t = e.target;
			if (t.dataset && t.dataset.opt) { B[t.dataset.opt] = t.checked; return updateSummary(); }
			if (t.id === 'b-lang') B.lang = t.value;
			if (t.id === 'b-urlversion') B.urlversion = t.value;
			if (t.id === 'b-urlsite') {
				B.urlsite = t.value;
				$q('#b-version-row').hidden = B.urlsite === 'yallversion';
			}
		});
	}

	function syncDayPills() {
		var key = B.days.slice().sort().join(',');
		setPressed('[data-days]', function (p) { return p.dataset.days === key; });
	}

	/* ---------- My plan ---------- */

	function renderPlanView() {
		var empty = $q('#view-plan .plan-empty'), body = $q('#view-plan .plan-body');
		if (!state.active) {
			empty.innerHTML = '<div class="empty-icon">' + icon('myplan') + '</div><h1>No plan yet</h1>' +
				'<p class="muted">Pick a ready-made plan or build your own.</p>' +
				'<div class="pill-row"><a class="btn btn-primary btn-lg" href="#plans">Browse plans</a><a class="btn btn-ghost btn-lg" href="#create">Build your own</a></div>';
			empty.hidden = false;
			body.hidden = true;
			return;
		}
		empty.hidden = true;
		body.hidden = false;
		updatePlanHead();
		updateProgress(false);
	}

	function renderPlanSwitch() {
		var el = $q('.plan-switch');
		el.hidden = mine.list.length < 2;
		if (el.hidden) { el.innerHTML = ''; return; }
		el.innerHTML = mine.list.map(function (e) {
			return '<button type="button" class="filter" data-switch-plan="' + e.id + '" aria-pressed="' + (e === state.active) + '">' + esc(entryName(e)) + '</button>';
		}).join('') + '<a class="filter plan-switch-add" href="#create" data-new-plan aria-label="New plan">' + icon('create') + '</a>';
	}

	function updatePlanHead() {
		var p = currentParams(), days = planDays();
		renderPlanSwitch();
		$q('#plan-name').textContent = planName();
		var sub = [];
		if (days.length) {
			var first = days[0].date, last = days[days.length - 1].date;
			sub.push(fmt(first, { month: 'short', day: 'numeric', year: first.getFullYear() !== last.getFullYear() ? 'numeric' : undefined }) + ' – ' + fmt(last, { month: 'short', day: 'numeric', year: 'numeric' }));
		}
		sub.push(daysLabel(p.get('daysofweek')));
		$q('#plan-sub').textContent = sub.join(' · ');
		var format = p.get('format') || 'list';
		if (HIDDEN_FORMATS.indexOf(format) > -1) {
			jQuery('input[name=formatstyle][value="calendar"]').prop('checked', true).trigger('change');
			return;
		}
		$$('.layout-switch button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.format === format)); });
	}

	function updateProgress(animate) {
		var p = progress();
		$q('#plan-progress-count').textContent = p.done;
		$q('#plan-progress-label').textContent = 'of ' + p.total + ' read';
		var fill = $q('#plan-progress-fill');
		if (motionOK) g.to(fill, { width: p.pct + '%', duration: animate ? 0.6 : 1, ease: 'power3.out' });
		else fill.style.width = p.pct + '%';
	}

	function animateOutput() {
		if (!motionOK || state.view !== 'plan') return;
		if (state.quietRender) { state.quietRender = false; return; }
		var items = $$('#output .month-block .entry, #output .week-block, #output .plan-calendar tbody tr, #output .plan-books .book, #output > div > svg, '
			+ '#output .layout-matrix tbody tr, #output .sec-group, #output .progress-summary, #output .pb-row, #output .board-card, #output .layout-weekrows tbody tr, #output .habit-stats > div, #output .habit-month').slice(0, 28);
		g.fromTo(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.015, ease: 'power2.out', clearProps: 'transform,opacity' });
	}

	/* Weeks layout: a week whose readings are all checked dims back so the weeks ahead stand out.
	   `animate` marks the moment a week becomes complete. */
	function markCompleteWeeks(animate) {
		$$('#output .week-block').forEach(function (block) {
			var checks = $$('.reading-check', block);
			var complete = checks.length > 0 && checks.every(function (c) { return c.checked; });
			var was = block.classList.contains('is-complete');
			if (complete === was) return;
			block.classList.toggle('is-complete', complete);
			if (animate && complete && motionOK) {
				g.fromTo(block, { scale: 1 }, { scale: 0.97, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.inOut', clearProps: 'transform' });
				g.fromTo($q('.week', block), { '--done': 0 }, { '--done': 1, duration: 0.5, delay: 0.15, ease: 'back.out(3)' });
			}
		});
	}

	/* Re-render a live layout after a check, without the entrance animation or a scroll jump.
	   On the Board, a book whose column changed slides in. */
	function refreshLiveLayout(checkedId) {
		var y = window.scrollY, before = {};
		$$('#output .board-card').forEach(function (c) { before[c.dataset.book] = c.closest('.board-col').dataset.col; });
		state.quietRender = true;
		updateDisplay();
		window.scrollTo(0, y);
		if (!motionOK) return;
		$$('#output .board-card').forEach(function (c) {
			var col = c.closest('.board-col').dataset.col;
			if (before[c.dataset.book] && before[c.dataset.book] !== col) {
				g.fromTo(c, { opacity: 0, x: -24, scale: 0.96 }, { opacity: 1, x: 0, scale: 1, duration: 0.55, ease: 'back.out(1.6)', clearProps: 'transform,opacity' });
			}
		});
		var box = checkedId && doc.getElementById(checkedId);
		if (box && box.checked) g.fromTo(box, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
	}

	window.onPlanRendered = function () {
		markCompleteWeeks(false);
		// a plan opened from a link with no name takes the engine's title, so the switcher can label it
		if (state.active && !state.active.name && window.currentTitle) {
			state.active.name = String(window.currentTitle).split(' - ')[0];
			saveActive();
		}
		if (state.view === 'plan' && state.active) {
			updatePlanHead();
			updateProgress(true);
			animateOutput();
		}
	};

	/* ---------- Router ---------- */

	var VIEWS = ['home', 'plans', 'create', 'plan'];

	function routeFromHash() {
		var h = location.hash.replace('#', '');
		return VIEWS.indexOf(h) > -1 ? h : null;
	}

	/* Nav "lens": an inverted copy of the tabs, clipped to a pill that springs to the active tab
	   and leans a few pixels toward a hovered one (same idea as brisk.cool's NavPill). */
	var lens = { x: 0, w: 0, top: 0, bottom: 0, hover: null, shown: false, tween: null };

	function buildLens() {
		var nav = $q('.tabbar'), tabs = $$('.tabbar > .tab');
		var wrap = doc.createElement('div'), inner = doc.createElement('div');
		wrap.className = 'lens-wrap';
		wrap.setAttribute('aria-hidden', 'true');
		inner.className = 'lens';
		tabs.forEach(function (t, i) {
			var copy = doc.createElement('span');
			copy.className = 'tab';
			copy.innerHTML = t.innerHTML;
			inner.appendChild(copy);
			t.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { lens.hover = i; moveIndicator(false); } });
		});
		wrap.appendChild(inner);
		nav.appendChild(wrap);
		nav.addEventListener('pointerleave', function () { if (lens.hover !== null) { lens.hover = null; moveIndicator(false); } });
		if (window.ResizeObserver) new ResizeObserver(function () { moveIndicator(true); }).observe(nav);
	}

	function paintLens() {
		var el = $q('.lens');
		if (!el) return;
		var right = el.clientWidth - lens.x - lens.w;
		el.style.clipPath = 'inset(' + lens.top + 'px ' + right + 'px ' + lens.bottom + 'px ' + lens.x + 'px round 999px)';
	}

	function moveIndicator(instant) {
		var nav = $q('.tabbar'), wrap = $q('.lens-wrap'), tabs = $$('.tabbar > .tab');
		if (!wrap) return;
		var index = -1;
		tabs.forEach(function (t, i) { if (t.getAttribute('aria-current') === 'page') index = i; });
		if (index < 0) { wrap.style.opacity = 0; return; }
		var tab = tabs[index];
		var lean = lens.hover === null || lens.hover === index ? 0 : (lens.hover > index ? 4 : -4);
		var tx = tab.offsetLeft + lean, tw = tab.offsetWidth;
		lens.top = tab.offsetTop;
		lens.bottom = nav.clientHeight - tab.offsetTop - tab.offsetHeight;
		if (lens.tween) lens.tween.kill();
		if (instant || !motionOK || !lens.shown) {
			lens.x = tx;
			lens.w = tw;
			paintLens();
		} else {
			lens.tween = g.to(lens, { x: tx, w: tw, duration: 0.75, ease: 'back.out(1.25)', onUpdate: paintLens });
		}
		lens.shown = true;
		wrap.style.opacity = 1;
		nav.setAttribute('data-ready', '');
	}

	function renderView(view) {
		if (view === 'home') renderHome();
		else if (view === 'plans') renderPlans();
		else if (view === 'create') renderCreate();
		else if (view === 'plan') renderPlanView();
	}

	function show(view, instant) {
		var prev = state.view ? $q('#view-' + state.view) : null, next = $q('#view-' + view);
		if (state.view === view) { renderView(view); return; }
		if (state.view === 'create') createMode = null;
		setPlanMenu(false);
		state.view = view;
		doc.body.dataset.view = view;
		doc.title = { home: 'Read the Bible', plans: 'Plans · Read the Bible', create: 'Create a plan · Read the Bible', plan: 'My plan · Read the Bible' }[view];
		$$('.tabbar > .tab').forEach(function (t) {
			if (t.dataset.tab === view) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
		});
		moveIndicator(instant);

		function enter() {
			if (prev) prev.hidden = true;
			renderView(view);
			next.hidden = false;
			window.scrollTo(0, 0);
			if (motionOK) {
				g.fromTo($$('[data-anim]', next).filter(function (el) { return !el.closest('[hidden]'); }),
					{ y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' });
				var cards = $$('.plan-card:not([hidden]), .start-card, .plan-empty > *', next);
				if (cards.length) g.fromTo(cards, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, delay: 0.12, ease: 'power3.out', clearProps: 'transform,opacity' });
			}
			if (view === 'home') $$('.ring', next).forEach(function (r) { animateRing(r); });
			if (view === 'plan') animateOutput();
		}

		if (prev && motionOK) {
			g.to(prev, { opacity: 0, y: -8, duration: 0.16, ease: 'power1.in', onComplete: function () { g.set(prev, { clearProps: 'all' }); enter(); } });
		} else {
			enter();
		}
	}

	/* ---------- Reader text settings ---------- */

	var READER_SIZES = [15, 17, 19, 21, 24, 28, 32, 36, 40, 44, 48];
	var READER_KEY = 'rtb-reader';

	function bindReaderTools() {
		var prefs = store.get(READER_KEY) || {};
		var size = READER_SIZES.indexOf(prefs.size) > -1 ? prefs.size : 21;
		var wide = !!prefs.wide, lines = !!prefs.lines;
		var content = $q('#reading-modal-content'), panel = $q('.reading-modal-panel');

		function apply(keepPlace) {
			// keep the reader on the same spot in the passage while text reflows
			var ratio = keepPlace && panel.scrollHeight > panel.clientHeight ? panel.scrollTop / (panel.scrollHeight - panel.clientHeight) : null;
			content.style.setProperty('--reader-size', size + 'px');
			panel.classList.toggle('is-wide', wide);
			content.classList.toggle('is-verse-lines', lines);
			$q('[data-reader="smaller"]').disabled = size === READER_SIZES[0];
			$q('[data-reader="larger"]').disabled = size === READER_SIZES[READER_SIZES.length - 1];
			$q('[data-reader="wide"]').setAttribute('aria-pressed', String(wide));
			$q('[data-reader="lines"]').setAttribute('aria-pressed', String(lines));
			store.set(READER_KEY, { size: size, wide: wide, lines: lines });
			if (ratio !== null) {
				requestAnimationFrame(function () { panel.scrollTop = ratio * (panel.scrollHeight - panel.clientHeight); });
			}
		}

		$q('.reader-tools').addEventListener('click', function (e) {
			var t = e.target.closest('[data-reader]');
			if (!t) return;
			var i = READER_SIZES.indexOf(size);
			if (t.dataset.reader === 'smaller' && i > 0) size = READER_SIZES[i - 1];
			if (t.dataset.reader === 'larger' && i < READER_SIZES.length - 1) size = READER_SIZES[i + 1];
			if (t.dataset.reader === 'wide') wide = !wide;
			if (t.dataset.reader === 'lines') lines = !lines;
			apply(true);
			if (motionOK) g.fromTo(t, { scale: 0.85 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
		});

		apply(false);
	}

	/* ---------- Back to top ---------- */

	function bindBackToTop() {
		var btn = $q('.to-top'), shown = false, ticking = false;

		function update() {
			ticking = false;
			// on Create, float just above the builder's bottom bar wherever it currently sits
			var bar = state.view === 'create' ? $q('.builder-bar') : null;
			if (bar) {
				var above = window.innerHeight - bar.getBoundingClientRect().top;
				btn.style.bottom = Math.max(24, above + 12) + 'px';
			} else {
				btn.style.bottom = '';
			}
			var show = window.scrollY > window.innerHeight * 0.9;
			if (show === shown) return;
			shown = show;
			if (motionOK) {
				g.killTweensOf(btn);
				if (show) {
					btn.hidden = false;
					g.fromTo(btn, { opacity: 0, y: 16, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(2)' });
				} else {
					g.to(btn, { opacity: 0, y: 12, scale: 0.9, duration: 0.2, ease: 'power2.in', onComplete: function () { btn.hidden = true; } });
				}
			} else {
				btn.hidden = !show;
			}
		}

		window.addEventListener('scroll', function () {
			if (!ticking) { ticking = true; requestAnimationFrame(update); }
		}, { passive: true });
		window.addEventListener('hashchange', function () { setTimeout(update, 400); });

		btn.addEventListener('click', function () {
			window.scrollTo({ top: 0, behavior: motionOK ? 'smooth' : 'auto' });
			var focusTarget = $q('.tabbar > .tab[aria-current="page"]');
			if (focusTarget) setTimeout(function () { focusTarget.focus({ preventScroll: true }); }, motionOK ? 500 : 0);
		});
	}

	/* ---------- Global events ---------- */

	/* The bar's progressive blur only shows once the page has scrolled (see .appbar-blur) */
	function syncScrolled() { doc.documentElement.classList.toggle('is-scrolled', window.scrollY > 2); }

	function bindEvents() {
		window.addEventListener('hashchange', function () { show(routeFromHash() || 'home'); });
		window.addEventListener('scroll', syncScrolled, { passive: true });
		syncScrolled();

		doc.addEventListener('click', function (e) {
			var t;
			if (e.target.closest('.plan-more')) return setPlanMenu(!$q('.plan-menu').classList.contains('is-open'));
			// Remove asks once more in place before it goes
			if ((t = e.target.closest('.js-remove-plan'))) {
				if (!t.classList.contains('is-confirm')) {
					t.classList.add('is-confirm');
					$q('span', t).textContent = 'Remove this plan?';
					clearTimeout(t._reset);
					t._reset = setTimeout(function () { resetRemove(t); }, 3500);
					return;
				}
				resetRemove(t);
				setPlanMenu(false);
				if (state.active) removePlan(state.active.id);
				return;
			}
			if ((t = e.target.closest('[data-switch-plan]'))) {
				// links (Home cards) carry on to #plan; the chips on My plan re-render in place
				if (switchPlan(t.dataset.switchPlan) && state.view === 'plan' && t.tagName === 'BUTTON') {
					renderPlanView();
					window.scrollTo({ top: 0, behavior: motionOK ? 'smooth' : 'auto' });
				}
				if (t.tagName === 'BUTTON') return;
			}
			// any other click closes the menu; a click on one of its items still runs below
			if ($q('.plan-menu.is-open')) setPlanMenu(false);
			if ((t = e.target.closest('[data-plan]'))) return openPlanSheet(t.dataset.plan);
			if ((t = e.target.closest('[data-filter]'))) return applyFilter(t.dataset.filter, true);
			if ((t = e.target.closest('[data-open-sheet]'))) return sheets.open(doc.getElementById(t.dataset.openSheet));
			if ((t = e.target.closest('[data-close-sheet]'))) return sheets.close(t.closest('.sheet'));
			if ((t = e.target.closest('[data-edit-plan]'))) {
				builderFrom(currentParams());
				if (state.active && state.active.name) B.name = state.active.name;
				createMode = 'edit';
				return;
			}
			if (e.target.closest('[data-new-plan]')) {
				resetBuilder();
				createMode = 'new';
				return;
			}

			if ((t = e.target.closest('.layout-switch [data-format]'))) {
				$$('.layout-switch button').forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); });
				jQuery('input[name=formatstyle][value="' + t.dataset.format + '"]').prop('checked', true).trigger('change');
				return;
			}

			if ((t = e.target.closest('.js-mark'))) {
				var key = t.dataset.key, done = !isRead(key), card = t.closest('.today-card');
				var ring = card && $q('.ring', card), before = ring ? +ring.dataset.pct : 0;
				setRead(key, done);
				var box = doc.getElementById(key);
				if (box) box.checked = done;
				markCompleteWeeks(false);
				t.classList.toggle('is-done', done);
				t.innerHTML = done ? icon('check') + '<span>Done</span>' : '<span>Mark as read</span>';
				if (motionOK && done) g.fromTo(t, { scale: 0.92 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
				if (ring) {
					ring.dataset.pct = progress(ctxFor(findPlan(card.dataset.planId))).pct;
					animateRing(ring, before);
				}
				return;
			}

			if ((t = e.target.closest('[data-export]'))) {
				var kind = t.dataset.export, sheet = $q('#export-sheet');
				if (kind === 'print') { sheets.close(sheet, function () { setTimeout(actionprint, 50); }); return; }
				if (kind === 'ics') { downloadics(); toast('Calendar file saved'); }
				if (kind === 'csv') { downloadcsv(); toast('Spreadsheet saved'); }
				if (kind === 'link') {
					var url = location.origin + location.pathname + (state.active ? state.active.query : '');
					if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast('Could not copy the link'); });
				}
				sheets.close(sheet);
				return;
			}

			if (e.target.closest('#plan-sheet-start') && sheetPlan) {
				var plan = sheetPlan;
				sheets.close($q('#plan-sheet'), function () {
					var existing = entryForTemplate(plan.id);
					if (existing) { switchPlan(existing.id); location.hash = 'plan'; return; }
					var params = {}, k;
					for (k in plan.params) params[k] = plan.params[k];
					params.start = ymd(today());
					startPlan(params, { name: plan.title, planId: plan.id });
				});
				return;
			}
			if (e.target.closest('#plan-sheet-customize') && sheetPlan) {
				var p2 = sheetPlan;
				sheets.close($q('#plan-sheet'), function () {
					builderFrom(p2.params);
					createMode = 'template';
					if (location.hash === '#create') renderCreate(); else location.hash = 'create';
				});
				return;
			}

			if (e.target.closest('#jump-today')) {
				var todayEl = $q('#output .is-today');
				if (!todayEl) { toast(todayInfo().status === 'upcoming' ? 'Your plan hasn’t started yet' : 'No reading today'); return; }
				todayEl.scrollIntoView({ behavior: motionOK ? 'smooth' : 'auto', block: 'center' });
				if (motionOK) g.fromTo(todayEl, { scale: 1 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1, delay: 0.5, ease: 'power2.inOut', clearProps: 'transform' });
			}
		});

		$q('#output').addEventListener('change', function (e) {
			if (!e.target.classList.contains('reading-check')) return;
			updateProgress(true);
			markCompleteWeeks(true);
			if (LIVE_FORMATS.indexOf(currentParams().get('format')) > -1) return refreshLiveLayout(e.target.id);
			if (motionOK && e.target.checked) g.fromTo(e.target, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
		});

		doc.addEventListener('keydown', function (e) {
			if (e.key !== 'Escape') return;
			if ($q('.plan-menu.is-open')) { setPlanMenu(false); $q('.plan-more').focus(); return; }
			var open = $$('.sheet[aria-hidden="false"]').filter(function (s) { return s.id !== 'reading-modal'; });
			if (open.length) closeSheet(open[open.length - 1]);
		});
	}

	/* Phones: the ••• menu holding Edit / Display / Save (on wider screens they sit inline) */
	function resetRemove(btn) {
		clearTimeout(btn._reset);
		btn.classList.remove('is-confirm');
		$q('span', btn).textContent = 'Remove';
	}

	function setPlanMenu(open) {
		var menu = $q('.plan-menu'), btn = $q('.plan-more');
		if (!open) $$('.js-remove-plan.is-confirm').forEach(resetRemove);
		if (!menu || menu.classList.contains('is-open') === open) return;
		menu.classList.toggle('is-open', open);
		btn.setAttribute('aria-expanded', String(open));
		if (!open) return;
		var panel = $q('.plan-actions', menu);
		if (motionOK) g.fromTo(panel, { opacity: 0, scale: 0.94, y: -6 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.6)', clearProps: 'transform,opacity' });
		if (usingKeyboard) $q('.btn', panel).focus();
	}
	// only move focus into the menu when it was opened from the keyboard
	var usingKeyboard = false;
	doc.addEventListener('keydown', function () { usingKeyboard = true; }, true);
	doc.addEventListener('pointerdown', function () { usingKeyboard = false; }, true);

	/* Move the engine's display controls into the Display sheet */
	function mountDisplayControls() {
		$$('#display-sheet [data-slot]').forEach(function (slot) {
			var input = doc.getElementById(slot.dataset.slot);
			if (!input) return;
			if (input.type === 'checkbox') input.classList.add('switch');
			slot.appendChild(input);
		});
	}

	/* ---------- Boot ---------- */

	function matchTemplate(params) {
		return PLANS.filter(function (p) {
			var full = withDefaults(p.params);
			return ['total', 'order', 'books', 'logic', 'daysofweek'].every(function (k) {
				return String(params.get(k) || BASE[k]) === full[k];
			});
		})[0];
	}

	function boot() {
		mountDisplayControls();
		buildLens();
		bindBackToTop();
		bindReaderTools();
		bindBuilder();
		bindEvents();

		var params = new URLSearchParams(location.search);
		var linked = ['start', 'total', 'books', 'order'].some(function (k) { return params.has(k); });

		if (linked) {
			var k = keyOf(location.search);
			var known = state.active && keyOf(state.active.query) === k ? state.active : mine.list.filter(function (e) { return keyOf(e.query) === k; })[0];
			if (known) {
				state.active = known;
			} else {
				var match = matchTemplate(params), given = (params.get('name') || '').trim().slice(0, 60);
				state.active = { id: newId(), query: location.search, name: given || (match ? match.title : null), named: !!given, planId: match && !given ? match.id : null };
				mine.list.push(state.active);
			}
			saveActive();
			loadFromParams(params);
		} else if (state.active) {
			loadFromParams(new URLSearchParams(state.active.query));
		} else {
			loadFromParams(toQuery(PLANS[0].params, {
				format: 'list', lang: $q('#options-language').value || 'en', checkbox: '1', colors: '1', stats: '0',
				dailystats: '0', nodates: '0', includeurls: '0', urlsite: 'biblegateway', urlversion: 'NIV'
			}));
		}

		show(routeFromHash() || (linked ? 'plan' : 'home'), true);

		if (motionOK) {
			g.from('.brand', { y: -8, opacity: 0, duration: 0.6, ease: 'power3.out' });
			var bottomNav = window.matchMedia('(max-width: 759px)').matches;
			g.from('.tabbar', { y: bottomNav ? 16 : -8, opacity: 0, duration: 0.6, delay: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' });
		}
	}

	boot();
})();
