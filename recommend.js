/* Recommended plans for Home: which ready-made plans to suggest, and why.
   No DOM here; shell.js passes in the catalog, what's being followed and finished, and two helpers
   (startOf: a plan's start date, label: a date as text), and draws the cards. */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.rtbRecommend = factory();
})(this, function () {
	'use strict';

	var DAY = 864e5;

	// Where to go after a plan (finished, or most of the way through)
	var NEXT = {
		john: ['gospels', 'paul'],
		gospels: ['paul', 'nt90'],
		paul: ['nt90', 'endtimes'],
		nt90: ['otstory', 'year'],
		ntweek: ['otstory', 'psalms'],
		endtimes: ['nt90', 'otstory'],
		genesis: ['torah', 'otstory'],
		torah: ['otstory', 'david'],
		david: ['psalms', 'otstory'],
		psalms: ['david', 'year'],
		otstory: ['nt90', 'chrono'],
		easter: ['gospels', 'john'],
		christmas: ['john', 'gospels'],
		year: ['chrono', 'mcheyne'],
		chrono: ['mcheyne', 'year'],
		mcheyne: ['year', 'chrono']
	};
	// For someone who hasn't started anything yet
	var FIRST = { john: 'A good first plan', genesis: 'A good first plan', gospels: 'Meet Jesus four ways', year: 'The classic, one year' };
	// Whole-Bible year plans, suggested around New Year
	var YEAR_LONG = ['year', 'chrono', 'mcheyne'];

	function strip(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
	function daysBetween(a, b) { return Math.round((strip(b) - strip(a)) / DAY); }
	function testament(p) { return /\bwhole\b/.test(p.tags) ? 'whole' : /\bot\b/.test(p.tags) ? 'ot' : /\bnt\b/.test(p.tags) ? 'nt' : 'whole'; }

	/* opts: {
	     today: Date,
	     plans: [{ id, title, tags, params: { total }, startOn?, season? }]   the ready-made catalog
	     following: [{ planId, pct }]   plans being read now (planId null for a custom plan)
	     finished: [planId]             ready-made plans finished at some point
	     startOf(plan) -> Date          when the plan would start if started now
	     label(date) -> 'Dec 1'
	     limit: 5
	   }
	   Returns [{ id, reason, score }], best first; reason is null for a plain fill-in. */
	function recommend(opts) {
		var t = strip(opts.today), plans = opts.plans, byId = {}, best = {};
		plans.forEach(function (p) { byId[p.id] = p; });
		var following = opts.following || [], finished = opts.finished || [];
		var busy = {};
		following.forEach(function (f) { if (f.planId) busy[f.planId] = true; });

		function offer(id, score, reason) {
			var p = byId[id];
			if (!p || busy[id]) return;
			// a finished plan comes back only for its season
			if (finished.indexOf(id) > -1 && !p.startOn) return;
			if (!best[id] || score > best[id].score) best[id] = { id: id, score: score, reason: reason };
		}

		// 1. Plans tied to the calendar, in the run-up to their start (or while they're under way)
		plans.forEach(function (p) {
			if (!p.startOn) return;
			var start = strip(opts.startOf(p)), until = daysBetween(t, start), end = new Date(start.getTime() + (p.params.total - 1) * DAY);
			if (until > 0 && until <= 60) offer(p.id, 100 - until, 'Starts ' + opts.label(start) + (p.season ? ' · ' + p.season : ''));
			else if (until <= 0 && t <= end) offer(p.id, 90, 'Started ' + opts.label(start) + (p.season ? ' · ' + p.season : ''));
		});

		// 2. A whole year of reading, around New Year
		var m = t.getMonth(), d = t.getDate();
		if ((m === 11 && d >= 10) || (m === 0 && d <= 20)) {
			var year = m === 11 ? t.getFullYear() + 1 : t.getFullYear();
			YEAR_LONG.forEach(function (id, i) { offer(id, 70 - i, 'Read through ' + year); });
		}

		// 3. Next steps after what's been finished, or is most of the way done
		finished.forEach(function (id) {
			(NEXT[id] || []).forEach(function (n, i) { if (byId[id]) offer(n, 85 - i, 'Because you finished ' + byId[id].title); });
		});
		following.forEach(function (f) {
			if (!f.planId || !byId[f.planId] || f.pct < 60) return;
			(NEXT[f.planId] || []).forEach(function (n, i) { offer(n, 60 - i, 'Up next after ' + byId[f.planId].title); });
		});

		// 4. Balance: reading only one testament right now
		var sides = {};
		following.forEach(function (f) { var p = byId[f.planId]; sides[p ? testament(p) : 'whole'] = true; });
		var only = Object.keys(sides).length === 1 ? Object.keys(sides)[0] : null;
		if (only === 'nt' || only === 'ot') {
			plans.forEach(function (p, i) {
				if (testament(p) === (only === 'nt' ? 'ot' : 'nt')) offer(p.id, 50 - i * 0.1, 'Pairs with your ' + (only === 'nt' ? 'New' : 'Old') + ' Testament reading');
			});
		}

		// 5. Nothing started yet: short, welcoming first plans
		if (!following.length && !finished.length) {
			Object.keys(FIRST).forEach(function (id, i) { offer(id, 55 - i, FIRST[id]); });
		}

		// 6. Fill the rest in catalog order (calendar plans only near their season, above)
		plans.forEach(function (p, i) { if (!p.startOn) offer(p.id, 10 - i * 0.1, null); });

		return Object.keys(best).map(function (id) { return best[id]; })
			.sort(function (a, b) { return b.score - a.score; })
			.slice(0, opts.limit || 5);
	}

	return { recommend: recommend, NEXT: NEXT };
});
