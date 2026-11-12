/* Badge stickers: holographic die-cut stickers, one shape and type layout per badge.
   Shapes are assets/badges/*.svg (outlines taken from the badges.svg sticker sheet), used as CSS masks;
   the foil is CSS gradients (style.css .sticker) and the type is an SVG drawn here in the shape's own units.
   rtbStickers.html(badge, opts) takes a badge from rtbStreaks.catalog(). No other dependencies. */
(function () {
	'use strict';

	// width x height of each shape's viewBox (the longer side is 200)
	var SHAPES = {
		dome: [200, 132.14], barrel: [200, 99.66], cube: [200, 200], triangle: [200, 172.89], arch: [200, 100.14], leaf: [200, 67.1],
		pill: [200, 57.01], squircle: [172.62, 200], tomb: [125.98, 200], seal: [200, 196.09], tab: [89.73, 200], hex: [200, 179]
	};
	// the squircle's own outline, drawn again inside it as a keyline
	var SQUIRCLE = 'M124.19 200 L48.43 200 C21.8 200 0 178.2 0 151.57 L0 48.43 C0 21.8 21.8 0 48.43 0 L124.19 0 C150.83 0 172.62 21.8 172.62 48.43 L172.62 151.57 C172.62 178.2 150.83 200 124.19 200 Z';

	// rough average advance of a capital per em, to decide when a line needs squeezing to fit
	var ADVANCE = { tall: 0.47, wide: 0.86, round: 0.98, script: 0.4, ui: 0.68 };

	var FONTS_URL = 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Unbounded:wght@800&family=Yellowtail&display=swap';
	var fontsAsked = false;
	function loadFonts() {
		if (fontsAsked) return;
		fontsAsked = true;
		var link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = FONTS_URL;
		document.head.appendChild(link);
	}

	var uid = 0;

	function esc(v) {
		return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	/* One line of type, centered on x. Squeezed to maxW when it would run wider. */
	function line(str, x, y, size, font, maxW, ls) {
		str = String(str);
		var est = str.length * size * ADVANCE[font] + (ls || 0) * (str.length - 1);
		return '<text class="f-' + font + '" x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="middle"' +
			(ls ? ' letter-spacing="' + ls + '"' : '') +
			(maxW && est > maxW ? ' textLength="' + maxW + '" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(str) + '</text>';
	}

	/* Type set along a path (an arc or a ring), centered on it */
	function along(d, str, size, font, ls, fill) {
		var id = 'stk-' + (++uid);
		return '<path id="' + id + '" d="' + d + '" fill="none"/>' +
			'<text class="f-' + font + '" font-size="' + size + '"' + (ls ? ' letter-spacing="' + ls + '"' : '') + '>' +
			'<textPath href="#' + id + '" startOffset="50%" text-anchor="middle"' + (fill ? ' textLength="' + fill + '" lengthAdjust="spacing"' : '') + '>' + esc(str) + '</textPath></text>';
	}

	/* ---------- One type layout per shape (coordinates in that shape's viewBox) ---------- */

	var LAYOUT = {
		hex: function (d) { return line(d.big, 100, 104, 66, 'wide', 140) + line(d.small, 100, 134, 15, 'round', 118, 1); },
		pill: function (d) { return line(d.big, 100, 39, 33, 'wide', 172) + (d.script ? '<g class="ink-script">' + line(d.script, 132, 53, 24, 'script', 96) + '</g>' : ''); },
		leaf: function (d) { return line(d.big, 100, 46, 34, 'round', 164); },
		barrel: function (d) { return line(d.big, 100, 80, 70, 'tall', 112) + line(d.left, 25, 56, 14, 'round', 34) + line(d.right, 175, 56, 14, 'round', 34); },
		tomb: function (d) {
			return line(d.big, 63, 108, 74, 'tall', 100) + line(d.small, 63, 133, 13, 'round', 96, 1) + (d.tiny ? line(d.tiny, 63, 158, 10, 'ui', 70, 3) : '');
		},
		squircle: function (d) {
			return '<path class="ink-line" d="' + SQUIRCLE + '" transform="translate(9.5 11) scale(.89)" fill="none" stroke-width="1.6"/>' +
				line(d.big, 86, 106, 56, 'wide', 128) + line(d.small, 86, 140, 26, 'tall', 118) + line(d.tiny, 86, 170, 10, 'ui', 100, 3);
		},
		seal: function (d) {
			var ring = 'M24 98a76 76 0 1 1 152 0a76 76 0 1 1-152 0';
			return along(ring, d.ring + ' ' + d.ring, 11, 'round', 1, 470) + line(d.big, 100, 114, 56, 'wide', 100) + line(d.small, 100, 133, 10, 'ui', 80, 3);
		},
		tab: function (d) { return line(d.top, 45, 82, 46, 'tall', 70) + line(d.bottom, 45, 130, 46, 'tall', 70) + line(d.small, 45, 166, 10, 'round', 66); },
		triangle: function (d) { return line(d.top, 100, 90, 18, 'tall', 66) + line(d.big, 100, 136, 50, 'tall', 118) + line(d.small, 100, 156, 9, 'ui', 150, 3); },
		cube: function (d) { return line(d.top, 100, 32, 13, 'ui', 150, 5) + line(d.l1, 100, 106, 64, 'wide', 166) + line(d.l2, 100, 174, 64, 'wide', 166); },
		arch: function (d) { return along('M41 100a59 59 0 0 1 118 0', d.arc, 28, 'wide', 0, 178); },
		dome: function (d) {
			return along('M14 100a86 86 0 0 1 172 0', d.arc, 11, 'round', 2) + line(d.mid, 100, 58, 9, 'ui', 84, 3) + line(d.big, 100, 124, 62, 'tall', 118);
		}
	};

	/* ---------- What each badge's sticker says ---------- */

	var PLAN_STICKERS = {
		year: { shape: 'squircle', big: 'BIBLE', small: 'IN A YEAR', tiny: '365 DAYS' },
		chrono: { shape: 'barrel', big: 'CHRONO', left: 'GEN', right: 'REV' },
		mcheyne: { shape: 'cube', top: 'M’CHEYNE', l1: 'FOUR', l2: 'A DAY' },
		nt90: { shape: 'hex', big: 'NT 90', small: 'NINETY DAYS' },
		ntweek: { shape: 'pill', big: 'WEEKDAYS', script: 'New Testament' },
		gospels: { shape: 'tab', top: 'MT MK', bottom: 'LK JN', small: 'GOSPELS' },
		john: { shape: 'tomb', big: 'JOHN', small: '40 DAYS', tiny: 'ONE GOSPEL' },
		psalms: { shape: 'dome', arc: 'SONGS · AND · WISDOM', mid: '& PROVERBS', big: 'PSALMS' },
		otstory: { shape: 'triangle', top: 'OLD TESTAMENT', big: 'STORY', small: 'IN ORDER' },
		genesis: { shape: 'leaf', big: 'GENESIS' },
		torah: { shape: 'barrel', big: 'TORAH', left: 'GEN', right: 'DEU' },
		david: { shape: 'seal', ring: 'SHEPHERD · KING · PSALMIST ·', big: 'DAVID', small: 'STORIES' },
		paul: { shape: 'arch', arc: 'PAUL’S JOURNEY' },
		endtimes: { shape: 'cube', top: 'THE', l1: 'END', l2: 'TIMES' },
		easter: { shape: 'tomb', big: 'RISEN', small: 'ROAD TO EASTER', tiny: '40 DAYS' },
		christmas: { shape: 'dome', arc: 'THE · ROAD · TO · CHRISTMAS', mid: '25 DAYS', big: 'NOEL' },
		custom: { shape: 'pill', big: 'MY PLAN', script: 'made my way' }
	};

	// The year a challenge sticker shows: the window in play, or the last one earned once that's over
	function challengeYear(b) {
		var n = b.now;
		return b.years[0] && n.status !== 'earned' && n.status !== 'active' ? b.years[0] : n.year;
	}

	function design(b, opts) {
		if (b.kind === 'plan') return PLAN_STICKERS[b.id] || { shape: 'pill', big: b.title.toUpperCase() };
		if (b.kind === 'challenge') {
			var y = String(opts.year || challengeYear(b));
			if (b.id === 'feb21') return { shape: 'seal', ring: 'FEBRUARY · 21 DAYS ·', big: '21', small: y };
			if (b.id === 'lent') return { shape: 'tomb', big: 'LENT', small: 'TO EASTER', tiny: y };
			return { shape: 'dome', arc: 'ADVENT · TO · CHRISTMAS', mid: 'TWENTY DAYS', big: y };
		}
		var n = opts.tier || b.level || b.tiers[0].n;
		switch (b.id) {
			case 'readings': return { shape: 'hex', big: n, small: n === 1 ? 'READING' : 'READINGS' };
			case 'streak': return { shape: 'arch', arc: n + ' DAY STREAK' };
			case 'visits': return { shape: 'pill', big: n + (n === 1 ? ' DAY' : ' DAYS'), script: 'showing up' };
			case 'started': return { shape: 'triangle', top: 'PLANS', big: n, small: 'STARTED' };
			case 'finished': return { shape: 'squircle', big: n, small: 'FINISHED', tiny: n === 1 ? 'PLAN' : 'PLANS' };
			default: return { shape: 'leaf', big: 'SHARED ×' + n };
		}
	}

	// a steady, different foil for each badge: where the sheen sits and how the colors turn
	function foil(key) {
		var h = 0;
		for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
		return '--ga:' + (h % 360) + 'deg;--hx:' + (18 + (h >> 4) % 60) + '%;--hy:' + (8 + (h >> 9) % 40) + '%';
	}

	/* opts: { size: 'sm' | 'lg', locked: bool, tier: n, year: y } */
	function html(b, opts) {
		opts = opts || {};
		loadFonts();
		var d = design(b, opts), wh = SHAPES[d.shape], locked = opts.locked != null ? opts.locked : !b.earned;
		return '<span class="sticker-wrap' + (opts.size ? ' sticker-' + opts.size : '') + '" data-shape="' + d.shape + '">' +
			'<span class="sticker' + (locked ? ' is-locked' : '') + '" data-shape="' + d.shape + '" style="' + foil(b.key + (opts.year || '')) + '">' +
			'<svg class="sticker-ink" viewBox="0 0 ' + wh[0] + ' ' + wh[1] + '" aria-hidden="true">' + LAYOUT[d.shape](d) + '</svg></span></span>';
	}

	window.rtbStickers = { html: html, shapes: SHAPES };
})();
