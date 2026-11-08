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
			params: { total: 30, order: 'traditional', books: 'GEN', logic: 'chapters' } }
	];
	PLANS.forEach(function (p) { if (p.params.total <= 90) p.tags += ' short'; });
	function planById(id) { return PLANS.filter(function (p) { return p.id === id; })[0]; }

	var FILTERS = [['all', 'All'], ['whole', 'Whole Bible'], ['ot', 'Old Testament'], ['nt', 'New Testament'], ['short', '3 months or less']];

	/* Abstract covers, drawn in a 160×120 box */
	var ART = {
		sun: ['#efe4d3', function () {
			return '<circle cx="80" cy="74" r="32" fill="#c4552b"/><rect y="74" width="160" height="46" fill="#e2d2ba"/>' +
				'<rect x="38" y="86" width="84" height="4" rx="2" fill="#161513"/><rect x="54" y="96" width="52" height="4" rx="2" fill="#161513"/><rect x="68" y="106" width="24" height="4" rx="2" fill="#161513"/>';
		}],
		timeline: ['#dce6e1', function () {
			return '<rect x="22" y="26" width="72" height="12" rx="6" fill="#2f5d57"/><rect x="44" y="45" width="90" height="12" rx="6" fill="#2f5d57"/>' +
				'<rect x="30" y="64" width="56" height="12" rx="6" fill="#e9a23b"/><rect x="62" y="83" width="76" height="12" rx="6" fill="#2f5d57"/>';
		}],
		four: ['#e7e0f0', function () {
			return '<rect x="32" y="48" width="18" height="60" rx="9" fill="#4a3c7a"/><rect x="58" y="28" width="18" height="80" rx="9" fill="#4a3c7a"/>' +
				'<rect x="84" y="62" width="18" height="46" rx="9" fill="#e2725b"/><rect x="110" y="40" width="18" height="68" rx="9" fill="#4a3c7a"/>';
		}],
		cross: ['#161513', function () {
			return '<rect x="72" y="16" width="14" height="78" rx="2" fill="#f4f2ee"/><rect x="48" y="38" width="62" height="14" rx="2" fill="#f4f2ee"/>' +
				'<circle cx="104" cy="92" r="8" fill="#c4552b"/>';
		}],
		dots: ['#f3e5c8', function () {
			var s = '';
			for (var i = 0; i < 7; i++) {
				var x = 26 + i * 18;
				s += (i === 0 || i === 6)
					? '<circle cx="' + x + '" cy="60" r="6" fill="none" stroke="#161513" stroke-width="2"/>'
					: '<circle cx="' + x + '" cy="60" r="7" fill="' + (i === 3 ? '#c4552b' : '#161513') + '"/>';
			}
			return s;
		}],
		quad: ['#cfe0ec', function () {
			var c = ['#1f4e79', '#5c88b0', '#1f4e79', '#f4f2ee'];
			var p = ['M77 57V21A36 36 0 0 0 41 57Z', 'M83 57V21A36 36 0 0 1 119 57Z', 'M83 63H119A36 36 0 0 1 83 99Z', 'M77 63H41A36 36 0 0 0 77 99Z'];
			return p.map(function (d, i) { return '<path d="' + d + '" fill="' + c[i] + '"/>'; }).join('');
		}],
		rays: ['#f6dcae', function () {
			var s = '<circle cx="80" cy="62" r="16" fill="#b5481f"/>';
			for (var i = 0; i < 12; i++) {
				var a = i * Math.PI / 6, x1 = 80 + Math.cos(a) * 25, y1 = 62 + Math.sin(a) * 25, x2 = 80 + Math.cos(a) * 40, y2 = 62 + Math.sin(a) * 40;
				s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#b5481f" stroke-width="4" stroke-linecap="round"/>';
			}
			return s;
		}],
		waves: ['#d6e5ee', function () {
			var s = '', colors = ['#2b5f82', '#2b5f82', '#f4f2ee', '#2b5f82'];
			for (var i = 0; i < 4; i++) {
				s += '<path d="M-20 ' + (36 + i * 16) + ' q20 -12 40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="' + colors[i] + '" stroke-width="5" stroke-linecap="round"/>';
			}
			return s;
		}],
		mountain: ['#eadcc9', function () {
			return '<circle cx="114" cy="36" r="12" fill="#c4552b"/><path d="M6 108 60 40l30 38 18-22 48 52Z" fill="#6e4b2e"/><path d="M40 108 70 74l20 20 12-10 26 24Z" fill="#161513"/>';
		}],
		seed: ['#dce8cf', function () {
			return '<path d="M80 106C80 86 80 64 82 40" fill="none" stroke="#3e6b2f" stroke-width="5" stroke-linecap="round"/>' +
				'<path d="M81 62c10-18 28-22 40-20-6 16-22 26-40 20Z" fill="#3e6b2f"/><path d="M80 80c-10-14-26-18-38-14 6 14 22 20 38 14Z" fill="#6e9a57"/>' +
				'<circle cx="82" cy="34" r="7" fill="#161513"/>';
		}]
	};

	function cover(art) {
		var a = ART[art] || ART.sun;
		return '<svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="160" height="120" fill="' + a[0] + '"/>' + a[1]() + '</svg>';
	}

	/* ---------- Plan math (uses the engine directly, without touching the form) ---------- */

	var BASE = { total: 365, order: 'traditional', books: 'OT,NT', logic: 'words', daysofweek: '1,2,3,4,5,6,7', dailypsalm: '0', dailyproverb: '0', otntoverlap: '0' };

	function withDefaults(p) {
		var out = {}, k;
		for (k in BASE) out[k] = BASE[k];
		for (k in p) if (p[k] != null) out[k] = String(p[k]);
		if (!out.start) out.start = ymd(today());
		return out;
	}

	function expandBooks(order, books) {
		var list = String(books || '').split(',').filter(Boolean);
		if (order === 'chronological') return list;
		if (order === 'mcheyne') return [];
		var out = [];
		list.forEach(function (b) {
			out = out.concat(bible.TESTAMENTS.indexOf(b) > -1 ? bible[b + '_BOOKS'] : [b]);
		});
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
				p.dailypsalm === '1', p.dailyproverb === '1', p.otntoverlap === '1', false, p.logic, false, 'biblegateway', 'NIV');
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

	var ACTIVE_KEY = 'rtb-active-plan';
	var state = { view: null, active: store.get(ACTIVE_KEY), filter: 'all' };

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
			includeurls: '0',
			urlsite: $q('#options-urlsite').value,
			urlversion: $q('#options-urlversion').value
		};
	}

	function toQuery(params, display) {
		var p = withDefaults(params), d = display || displayPrefs(), q = new URLSearchParams();
		['start', 'total', 'order', 'books', 'logic', 'daysofweek', 'dailypsalm', 'dailyproverb', 'otntoverlap'].forEach(function (k) { q.set(k, p[k]); });
		Object.keys(d).forEach(function (k) { q.set(k, d[k]); });
		return q;
	}

	function saveActive() { store.set(ACTIVE_KEY, state.active); }

	function startPlan(params, meta) {
		var q = toQuery(params);
		state.active = { query: '?' + q.toString(), name: meta.name, planId: meta.planId || null };
		saveActive();
		loadFromParams(q);
		if (location.hash !== '#plan') location.hash = 'plan';
		else renderPlanView();
		toast('Plan started');
	}

	window.onPlanQuery = function (query) {
		if (!state.active) return;
		state.active.query = query;
		saveActive();
		history.replaceState(null, '', location.pathname + query + location.hash);
	};

	function planName() {
		if (state.active && state.active.name) return state.active.name;
		return String(window.currentTitle || 'My plan').split(' - ')[0];
	}

	function currentParams() { return new URLSearchParams(window.currentQuery || ''); }

	function planDays() { return window.lastPlanDays || []; }
	function dayKey(i) { return window.currentKey + '-' + i; }

	function progress() {
		var total = 0, done = 0;
		planDays().forEach(function (d, i) {
			if (!d.formattedReading) return;
			total++;
			if (isRead(dayKey(i))) done++;
		});
		return { total: total, done: done, pct: total ? Math.round(done / total * 100) : 0 };
	}

	function todayInfo() {
		var days = planDays(), t = today(), n = 0, info = { status: 'none', behind: 0 };
		if (!days.length) return info;
		var first = days[0].date, last = days[days.length - 1].date;
		for (var i = 0; i < days.length; i++) {
			var d = days[i];
			if (!d.formattedReading) continue;
			n++;
			var dd = new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate());
			if (dd < t && !isRead(dayKey(i))) info.behind++;
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

	function ringHtml() {
		return '<div class="ring" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="ring-track" cx="50" cy="50" r="42"/>' +
			'<circle class="ring-fill" cx="50" cy="50" r="42" stroke-dasharray="263.9" stroke-dashoffset="263.9"/></svg>' +
			'<div class="ring-label"><span class="ring-num">0%</span><small>read</small></div></div>';
	}

	function animateRing(root, from) {
		var ring = $q('.ring', root);
		if (!ring) return;
		var pct = progress().pct, fill = $q('.ring-fill', ring), num = $q('.ring-num', ring), C = 263.9;
		if (!motionOK) {
			fill.setAttribute('stroke-dashoffset', C * (1 - pct / 100));
			num.textContent = pct + '%';
			return;
		}
		var counter = { v: from == null ? 0 : from };
		g.to(fill, { attr: { 'stroke-dashoffset': C * (1 - pct / 100) }, duration: 1.2, ease: 'power3.out', delay: from == null ? 0.25 : 0 });
		g.to(counter, { v: pct, duration: 1.2, ease: 'power3.out', delay: from == null ? 0.25 : 0, onUpdate: function () { num.textContent = Math.round(counter.v) + '%'; } });
	}

	function todayCard() {
		var info = todayInfo(), days = planDays(), chip, ref, meta = '', actions;
		if (info.status === 'today') {
			var day = days[info.index], key = dayKey(info.index), done = isRead(key);
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
			actions = '<a class="btn btn-primary btn-lg" href="#plan">' + icon('myplan') + '<span>View plan</span></a>';
		} else {
			chip = '<span class="chip">Complete</span>';
			ref = 'You finished the plan.';
			actions = '<a class="btn btn-primary btn-lg" href="#plans">Find your next plan</a>';
		}
		if (info.behind > 0 && info.status !== 'done') {
			chip += '<a class="chip chip-accent" href="#plan">' + info.behind + ' to catch up</a>';
		}
		return '<article class="today-card" data-anim>' +
			'<div class="today-top">' + chip + '<span class="muted">' + esc(planName()) + '</span></div>' +
			'<div><h2 class="today-ref">' + ref + '</h2>' + (meta ? '<p class="today-meta muted">' + meta + '</p>' : '') + '</div>' +
			ringHtml() +
			'<div class="today-actions">' + actions + '</div></article>';
	}

	function planCard(p) {
		var current = state.active && state.active.planId === p.id;
		return '<button type="button" class="plan-card" data-plan="' + p.id + '" data-tags="' + p.tags + '">' +
			'<span class="cover">' + cover(p.art) + '</span>' +
			'<span class="plan-card-body"><strong>' + esc(p.title) + '</strong>' +
			'<span class="meta" data-meta="' + p.id + '">' + durationLabel(p.params.total) + '</span>' +
			(current ? '<span class="badge">Current</span>' : '') + '</span></button>';
	}

	function renderHome() {
		var el = $q('#view-home'), html = '';
		html += '<header class="greeting" data-anim><span class="eyebrow">' + fmt(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }) + '</span><h1>' + greeting() + '</h1></header>';

		if (state.active) {
			html += todayCard();
			html += '<div class="quick-row" data-anim>' +
				'<a class="btn" href="#plan">' + icon('myplan') + '<span>Full plan</span></a>' +
				'<a class="btn" href="#plans">' + icon('plans') + '<span>Browse plans</span></a>' +
				'<a class="btn" href="#create">' + icon('create') + '<span>New plan</span></a></div>';
		} else {
			html += '<section class="section"><div class="section-head" data-anim><h2>Start here</h2></div><div class="start-grid">' +
				'<button type="button" class="start-card is-featured" data-plan="year"><span class="start-icon">' + icon('book') + '</span><span class="start-text"><strong>Bible in a Year</strong><small>The classic, one year</small></span></button>' +
				'<a class="start-card" href="#plans"><span class="start-icon">' + icon('plans') + '</span><span class="start-text"><strong>Choose a plan</strong><small>' + PLANS.length + ' ready-made plans</small></span></a>' +
				'<a class="start-card" href="#create"><span class="start-icon">' + icon('create') + '</span><span class="start-text"><strong>Build your own</strong><small>Your books, your pace</small></span></a>' +
				'</div></section>';
		}

		html += '<section class="section"><div class="section-head" data-anim><h2>Popular plans</h2><a class="link-btn" href="#plans">See all ' + icon('arrow') + '</a></div>' +
			'<div class="shelf">' + PLANS.slice(0, 6).map(planCard).join('') + '</div></section>';

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
		var isCurrent = state.active && state.active.planId === p.id;
		$q('#plan-sheet-cover').innerHTML = cover(p.art);
		$q('#plan-sheet-title').textContent = p.title;
		$q('#plan-sheet-blurb').textContent = p.blurb;
		$q('#plan-sheet-facts').innerHTML =
			'<li>' + icon('calendar') + durationLabel(p.params.total) + '</li>' +
			'<li data-fact="min">' + icon('clock') + '…</li>' +
			'<li>' + icon('check') + daysLabel(p.params.daysofweek || BASE.daysofweek) + '</li>';
		$q('#plan-sheet-first').innerHTML = '';
		$q('#plan-sheet-start').textContent = isCurrent ? 'Continue plan' : 'Start today';
		$q('#plan-sheet-note').textContent = state.active && !isCurrent ? 'This replaces your current plan.' : '';
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

	/* ---------- Builder ---------- */

	var STEP_TITLES = ['What will you read?', 'How long?', 'Which days?', 'Finishing touches'];
	var B;

	function resetBuilder() {
		B = { step: 0, order: 'traditional', scope: 'whole', books: [], total: 365, start: ymd(today()), days: [1, 2, 3, 4, 5, 6, 7],
			dailypsalm: false, dailyproverb: false, otntoverlap: false, logic: 'words' };
	}
	resetBuilder();

	function builderFrom(params) {
		function get(k) { return params.get ? params.get(k) : params[k]; }
		resetBuilder();
		B.order = get('order') || 'traditional';
		if (B.order === 'alternate' || B.order === 'tanakh') B.order = 'traditional';
		var books = String(get('books') || 'OT,NT');
		if (books === 'OT,NT' || books === 'OT,DC,NT') B.scope = 'whole';
		else if (books === 'OT' || books === 'NT') B.scope = books;
		else { B.scope = 'custom'; B.books = expandBooks('traditional', books); }
		if (B.order === 'chronological' && B.scope === 'custom') B.scope = 'whole';
		B.total = parseInt(get('total'), 10) || 365;
		B.start = parseYmd(get('start')) ? get('start') : ymd(today());
		if (parseYmd(B.start) < today()) B.start = ymd(today());
		B.days = String(get('daysofweek') || BASE.daysofweek).split(',').filter(Boolean).map(Number);
		B.dailypsalm = get('dailypsalm') === '1';
		B.dailyproverb = get('dailyproverb') === '1';
		B.otntoverlap = get('otntoverlap') === '1';
		B.logic = get('logic') || 'words';
	}

	var CANON = [].concat(bible.OT_BOOKS, bible.NT_BOOKS, bible.DC_BOOKS);
	function sortCanon(list) { return list.slice().sort(function (a, b) { return CANON.indexOf(a) - CANON.indexOf(b); }); }

	function builderParams() {
		var books = B.order === 'mcheyne' || B.scope === 'whole' ? 'OT,NT' : B.scope === 'custom' ? sortCanon(B.books).join(',') : B.scope;
		return {
			start: B.start, total: B.total, order: B.order, books: books, logic: B.logic,
			daysofweek: B.days.slice().sort().join(','),
			dailypsalm: B.dailypsalm ? '1' : '0', dailyproverb: B.dailyproverb ? '1' : '0', otntoverlap: B.otntoverlap ? '1' : '0'
		};
	}

	function bookName(usfm) { return bible.getName(bible.BIBLE_DATA[usfm], 'en'); }

	function builderName() {
		if (B.order === 'mcheyne') return 'M’Cheyne Plan';
		var scope = { whole: 'Whole Bible', OT: 'Old Testament', NT: 'New Testament' }[B.scope];
		if (B.order === 'chronological') return 'Chronological ' + (B.scope === 'whole' ? 'Bible' : scope);
		if (scope) return scope;
		var books = sortCanon(B.books);
		if (!books.length) return 'Choose some books';
		if (books.length <= 3) return books.map(bookName).join(', ').replace(/, ([^,]*)$/, ' & $1');
		return books.length + ' books';
	}

	function builderValid() { return B.days.length > 0 && B.total > 0 && (B.scope !== 'custom' || B.books.length > 0 || B.order === 'mcheyne'); }

	function segmented(name, options, value) {
		return '<div class="segmented" role="radiogroup">' + options.map(function (o) {
			return '<button type="button" role="radio" data-' + name + '="' + o[0] + '" aria-checked="' + (String(value) === String(o[0])) + '">' + o[1] + '</button>';
		}).join('') + '</div>';
	}

	function pills(name, options, value) {
		return '<div class="pill-row">' + options.map(function (o) {
			return '<button type="button" class="pill" data-' + name + '="' + o[0] + '" aria-pressed="' + (String(value) === String(o[0])) + '">' + o[1] + '</button>';
		}).join('') + '</div>';
	}

	function bookGroup(key, label, list) {
		return '<div class="book-group"><div class="book-group-head"><strong>' + label + '</strong>' +
			'<button type="button" class="link-btn" data-book-all="' + key + '">All / none</button></div><div class="book-chips">' +
			list.map(function (u) { return '<button type="button" class="book-chip" data-book="' + u + '" aria-pressed="' + (B.books.indexOf(u) > -1) + '">' + esc(bookName(u)) + '</button>'; }).join('') +
			'</div></div>';
	}

	function nextMonday() { var d = today(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d; }
	function nextMonthFirst() { var d = today(); return new Date(d.getFullYear(), d.getMonth() + 1, 1); }
	function nextJan1() { var d = today(); return new Date(d.getFullYear() + 1, 0, 1); }

	function stepHtml() {
		var h = '<h2>' + STEP_TITLES[B.step] + '</h2>';
		if (B.step === 0) {
			h += '<div class="field"><span class="field-label">Order</span>' +
				segmented('order', [['traditional', 'Bible order'], ['chronological', 'Chronological'], ['mcheyne', 'M’Cheyne']], B.order) + '</div>';
			if (B.order !== 'mcheyne') {
				var count = B.books.length;
				h += '<div class="field"><span class="field-label">Books</span><div class="choice-grid">' +
					[['whole', 'Whole Bible', '66 books'], ['OT', 'Old Testament', '39 books'], ['NT', 'New Testament', '27 books'],
						['custom', 'Choose books', count ? count + ' selected' : 'Any you like']].map(function (c) {
						var disabled = c[0] === 'custom' && B.order === 'chronological';
						return '<button type="button" class="choice" data-scope="' + c[0] + '" aria-pressed="' + (B.scope === c[0]) + '"' + (disabled ? ' disabled' : '') + '><strong>' + c[1] + '</strong><small' + (c[0] === 'custom' ? ' id="custom-count"' : '') + '>' + c[2] + '</small></button>';
					}).join('') + '</div></div>';
				if (B.scope === 'custom') {
					h += '<div class="field book-picker">' + bookGroup('OT', 'Old Testament', bible.OT_BOOKS) + bookGroup('NT', 'New Testament', bible.NT_BOOKS) +
						bookGroup('DC', 'Deuterocanonical', bible.DC_BOOKS.filter(function (u) { return bible.BIBLE_DATA[u]; })) + '</div>';
				}
			}
		} else if (B.step === 1) {
			var presets = [30, 90, 182, 365, 730], custom = presets.indexOf(B.total) < 0;
			h += '<div class="field"><span class="field-label">Finish in</span>' +
				pills('total', [[30, '30 days'], [90, '3 months'], [182, '6 months'], [365, '1 year'], [730, '2 years'], ['custom', 'Custom']], custom ? 'custom' : B.total) +
				'<label class="inline-field"' + (custom ? '' : ' hidden') + ' id="custom-total"><input class="input input-days" type="number" min="1" max="3650" id="b-total" value="' + B.total + '"> days</label></div>';
			var starts = [['today', 'Today', today()], ['monday', 'Next Monday', nextMonday()], ['month', '1st of next month', nextMonthFirst()], ['jan', 'January 1', nextJan1()]];
			var picked = starts.filter(function (s) { return ymd(s[2]) === B.start; })[0];
			h += '<div class="field"><span class="field-label">Start</span>' +
				pills('start', starts.map(function (s) { return [ymd(s[2]), s[1]]; }), picked ? B.start : '') +
				'<label class="inline-field">or pick a date <input class="input" type="date" id="b-start" value="' + B.start + '"></label></div>';
		} else if (B.step === 2) {
			h += '<div class="field"><div class="weekdays">' + DAY_NAMES.map(function (n, i) {
				return '<button type="button" class="weekday" data-day="' + (i + 1) + '" aria-label="' + n + '" aria-pressed="' + (B.days.indexOf(i + 1) > -1) + '">' + n[0] + '</button>';
			}).join('') + '</div></div>' +
				'<div class="field"><span class="field-label">Quick picks</span>' +
				pills('days', [['1,2,3,4,5,6,7', 'Every day'], ['2,3,4,5,6', 'Weekdays'], ['2,3,4,5,6,7', 'Sundays off']], B.days.slice().sort().join(',')) + '</div>';
		} else {
			var canOverlap = B.order !== 'mcheyne' && B.scope === 'whole';
			h += '<div class="rows">' +
				'<label class="row"><span>Daily Psalm<small>One Psalm alongside each reading</small></span><input type="checkbox" class="switch" data-opt="dailypsalm"' + (B.dailypsalm ? ' checked' : '') + '></label>' +
				'<label class="row"><span>Daily Proverb<small>One Proverb alongside each reading</small></span><input type="checkbox" class="switch" data-opt="dailyproverb"' + (B.dailyproverb ? ' checked' : '') + '></label>' +
				(canOverlap ? '<label class="row"><span>Old & New together<small>Read from both each day</small></span><input type="checkbox" class="switch" data-opt="otntoverlap"' + (B.otntoverlap ? ' checked' : '') + '></label>' : '') +
				'</div>' +
				(B.order === 'mcheyne' ? '' : '<div class="field"><span class="field-label">Split readings by</span>' +
					segmented('logic', [['words', 'Even length'], ['chapters', 'Chapters'], ['pericopes', 'Stories']], B.logic) + '</div>');
		}
		return h;
	}

	function renderCreate() {
		var el = $q('#view-create');
		if (!el.firstChild) {
			el.innerHTML = '<div class="builder">' +
				'<header data-anim><span class="step-count" id="step-count"></span><ol class="stepper">' + '<li><span></span></li>'.repeat(4) + '</ol></header>' +
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
		$q('#step-count').textContent = 'Step ' + (B.step + 1) + ' of 4';
		$q('#step-back').style.visibility = B.step === 0 ? 'hidden' : 'visible';
		$q('#step-next').textContent = B.step === 3 ? 'Create plan' : 'Next';
		$$('.stepper span').forEach(function (s, i) {
			var w = i <= B.step ? '100%' : '0%';
			if (motionOK) g.to(s, { width: w, duration: 0.5, ease: 'power3.out' }); else s.style.width = w;
		});
		if (motionOK && direction) {
			g.fromTo(body, { x: 36 * direction, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
			g.from($$('.field, .rows', body), { y: 14, opacity: 0, duration: 0.45, stagger: 0.06, delay: 0.08, ease: 'power2.out', clearProps: 'transform,opacity' });
		}
		updateSummary();
	}

	function rerenderStep(revealSelector) {
		renderStep(0);
		if (revealSelector && motionOK) {
			var el = $q(revealSelector);
			if (el) g.from(el.children, { y: 12, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', clearProps: 'transform,opacity' });
		}
	}

	var summaryTimer, shownMinutes = null;
	function updateSummary() {
		$q('#sum-title').textContent = builderName();
		var next = $q('#step-next'), meta = $q('#sum-meta');
		next.disabled = B.step === 3 && !builderValid();
		if (!builderValid()) {
			meta.textContent = B.days.length ? 'Pick at least one book' : 'Pick at least one day';
			next.disabled = true;
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

	function bindBuilder() {
		var view = $q('#view-create');

		view.addEventListener('click', function (e) {
			var t = e.target.closest('button');
			if (!t || !view.contains(t)) return;
			var d = t.dataset;

			if (t.id === 'step-next') {
				if (B.step < 3) { B.step++; renderStep(1); }
				else if (builderValid()) startPlan(builderParams(), { name: builderName() });
				return;
			}
			if (t.id === 'step-back') { if (B.step > 0) { B.step--; renderStep(-1); } return; }

			if (d.order) {
				B.order = d.order;
				if (B.order === 'chronological' && B.scope === 'custom') B.scope = 'whole';
				if (B.order === 'mcheyne') B.total = 365;
				return rerenderStep();
			}
			if (d.scope) {
				B.scope = d.scope;
				return rerenderStep(d.scope === 'custom' ? '.book-picker' : null);
			}
			if (d.book) {
				var i = B.books.indexOf(d.book);
				if (i > -1) B.books.splice(i, 1); else B.books.push(d.book);
				t.setAttribute('aria-pressed', String(i < 0));
				if (motionOK) g.fromTo(t, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
				$q('#custom-count').textContent = B.books.length ? B.books.length + ' selected' : 'Any you like';
				return updateSummary();
			}
			if (d.bookAll) {
				var group = d.bookAll === 'DC' ? bible.DC_BOOKS.filter(function (u) { return bible.BIBLE_DATA[u]; }) : bible[d.bookAll + '_BOOKS'];
				var allOn = group.every(function (u) { return B.books.indexOf(u) > -1; });
				B.books = B.books.filter(function (u) { return group.indexOf(u) < 0; });
				if (!allOn) B.books = B.books.concat(group);
				$$('.book-chip', t.closest('.book-group')).forEach(function (c) { c.setAttribute('aria-pressed', String(!allOn)); });
				$q('#custom-count').textContent = B.books.length ? B.books.length + ' selected' : 'Any you like';
				return updateSummary();
			}
			if (d.total) {
				var custom = d.total === 'custom';
				if (!custom) B.total = +d.total;
				$$('[data-total]', view).forEach(function (p) { p.setAttribute('aria-pressed', String(p === t)); });
				$q('#custom-total').hidden = !custom;
				if (custom) { var input = $q('#b-total'); input.focus(); input.select(); }
				return updateSummary();
			}
			if (d.start) {
				B.start = d.start;
				$q('#b-start').value = B.start;
				$$('[data-start]', view).forEach(function (p) { p.setAttribute('aria-pressed', String(p === t)); });
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
				$$('.weekday', view).forEach(function (w, k) {
					w.setAttribute('aria-pressed', String(B.days.indexOf(k + 1) > -1));
				});
				if (motionOK) g.fromTo($$('.weekday', view), { scale: 0.9 }, { scale: 1, duration: 0.4, stagger: 0.03, ease: 'back.out(3)' });
				syncDayPills();
				return updateSummary();
			}
			if (d.logic) {
				B.logic = d.logic;
				$$('[data-logic]', view).forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); });
				return updateSummary();
			}
		});

		view.addEventListener('input', function (e) {
			if (e.target.id === 'b-total') {
				var v = parseInt(e.target.value, 10);
				if (v > 0) { B.total = Math.min(v, 3650); updateSummary(); }
			}
			if (e.target.id === 'b-start' && parseYmd(e.target.value)) {
				B.start = e.target.value;
				$$('[data-start]', view).forEach(function (p) { p.setAttribute('aria-pressed', String(p.dataset.start === B.start)); });
				updateSummary();
			}
		});

		view.addEventListener('change', function (e) {
			var opt = e.target.dataset && e.target.dataset.opt;
			if (opt) { B[opt] = e.target.checked; updateSummary(); }
		});
	}

	function syncDayPills() {
		var key = B.days.slice().sort().join(',');
		$$('#view-create [data-days]').forEach(function (p) { p.setAttribute('aria-pressed', String(p.dataset.days === key)); });
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

	function updatePlanHead() {
		var p = currentParams(), days = planDays();
		$q('#plan-name').textContent = planName();
		var sub = [];
		if (days.length) {
			var first = days[0].date, last = days[days.length - 1].date;
			sub.push(fmt(first, { month: 'short', day: 'numeric', year: first.getFullYear() !== last.getFullYear() ? 'numeric' : undefined }) + ' – ' + fmt(last, { month: 'short', day: 'numeric', year: 'numeric' }));
		}
		sub.push(daysLabel(p.get('daysofweek')));
		$q('#plan-sub').textContent = sub.join(' · ');
		var format = p.get('format') || 'list';
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
		var items = $$('#output .month-block .entry, #output .week-block, #output .plan-calendar tbody tr, #output .plan-books .book, #output > div > svg').slice(0, 28);
		g.fromTo(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.015, ease: 'power2.out', clearProps: 'transform,opacity' });
	}

	window.onPlanRendered = function () {
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

	function moveIndicator(instant) {
		var tab = $q('.tab[aria-current="page"]'), ind = $q('.tab-indicator');
		if (!tab) return;
		var phone = window.innerWidth < 760, box;
		if (phone) box = { x: tab.offsetLeft + (tab.offsetWidth - 56) / 2, y: tab.offsetTop + 3, width: 56, height: 30 };
		else box = { x: tab.offsetLeft, y: tab.offsetTop, width: tab.offsetWidth, height: tab.offsetHeight };
		if (g) g.to(ind, { x: box.x, y: box.y, width: box.width, height: box.height, opacity: 1, duration: instant || !motionOK ? 0 : 0.5, ease: 'power3.out' });
		else Object.assign(ind.style, { transform: 'translate(' + box.x + 'px,' + box.y + 'px)', width: box.width + 'px', height: box.height + 'px', opacity: 1 });
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
		state.view = view;
		doc.body.dataset.view = view;
		doc.title = { home: 'Read the Bible', plans: 'Plans · Read the Bible', create: 'Create a plan · Read the Bible', plan: 'My plan · Read the Bible' }[view];
		$$('.tab').forEach(function (t) {
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
			if (view === 'home') animateRing(next);
			if (view === 'plan') animateOutput();
		}

		if (prev && motionOK) {
			g.to(prev, { opacity: 0, y: -8, duration: 0.16, ease: 'power1.in', onComplete: function () { g.set(prev, { clearProps: 'all' }); enter(); } });
		} else {
			enter();
		}
	}

	/* ---------- Global events ---------- */

	function bindEvents() {
		window.addEventListener('hashchange', function () { show(routeFromHash() || 'home'); });
		window.addEventListener('resize', function () { moveIndicator(true); });

		doc.addEventListener('click', function (e) {
			var t;
			if ((t = e.target.closest('[data-plan]'))) return openPlanSheet(t.dataset.plan);
			if ((t = e.target.closest('[data-filter]'))) return applyFilter(t.dataset.filter, true);
			if ((t = e.target.closest('[data-open-sheet]'))) return sheets.open(doc.getElementById(t.dataset.openSheet));
			if ((t = e.target.closest('[data-close-sheet]'))) return sheets.close(t.closest('.sheet'));
			if ((t = e.target.closest('[data-edit-plan]'))) { builderFrom(currentParams()); return; }

			if ((t = e.target.closest('.layout-switch [data-format]'))) {
				$$('.layout-switch button').forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); });
				jQuery('input[name=formatstyle][value="' + t.dataset.format + '"]').prop('checked', true).trigger('change');
				return;
			}

			if ((t = e.target.closest('.js-mark'))) {
				var key = t.dataset.key, done = !isRead(key), before = progress().pct;
				setRead(key, done);
				var box = doc.getElementById(key);
				if (box) box.checked = done;
				t.classList.toggle('is-done', done);
				t.innerHTML = done ? icon('check') + '<span>Done</span>' : '<span>Mark as read</span>';
				if (motionOK && done) g.fromTo(t, { scale: 0.92 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
				animateRing($q('#view-home'), before);
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
					if (state.active && state.active.planId === plan.id) { location.hash = 'plan'; return; }
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
			if (motionOK && e.target.checked) g.fromTo(e.target, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
		});

		doc.addEventListener('keydown', function (e) {
			if (e.key !== 'Escape') return;
			var open = $$('.sheet[aria-hidden="false"]').filter(function (s) { return s.id !== 'reading-modal'; });
			if (open.length) closeSheet(open[open.length - 1]);
		});
	}

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
		bindBuilder();
		bindEvents();

		var params = new URLSearchParams(location.search);
		var linked = ['start', 'total', 'books', 'order'].some(function (k) { return params.has(k); });

		if (linked) {
			if (!state.active || state.active.query !== location.search) {
				var match = matchTemplate(params);
				state.active = { query: location.search, name: match ? match.title : null, planId: match ? match.id : null };
				saveActive();
			}
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
			g.from('.appbar .tab', { y: -6, opacity: 0, duration: 0.5, stagger: 0.05, delay: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' });
		}
	}

	boot();
})();
