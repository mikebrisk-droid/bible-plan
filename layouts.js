/* Extra plan layouts: Matrix, Sections, Progress, Board, Week rows and Habit.
   Each is a build<format>(lang, data) like the ones in renderers.js. They read the same plan data and
   the same per-day progress keys (currentKey + '-' + dayIndex), so a reading checked here is checked
   in every other layout too. */
(function () {
	'use strict';

	var SECTION_GROUPS = [
		{ id: 'law', label: 'Law', sections: ['pentateuch'] },
		{ id: 'history', label: 'History', sections: ['historical'] },
		{ id: 'poetry', label: 'Poetry & Wisdom', sections: ['poetic'] },
		{ id: 'prophets', label: 'Prophets', sections: ['major', 'minor'] },
		{ id: 'gospels', label: 'Gospels', sections: ['gospel'] },
		{ id: 'acts', label: 'Acts', sections: ['acts'] },
		{ id: 'letters', label: 'Letters', sections: ['pauline', 'pastoral', 'general'] },
		{ id: 'revelation', label: 'Revelation', sections: ['revelation'] },
		{ id: 'dc', label: 'Deuterocanonical', sections: ['deuterocanonical'] }
	];

	var STATUS_LABELS = { todo: 'Not started', doing: 'In progress', done: 'Completed', behind: 'Behind' };

	function esc(value) { return escapeHtml(value); }
	function dayKey(index) { return currentKey + '-' + index; }
	function isDone(index) { return getLocalStorage(dayKey(index), false) === 'true'; }
	function strip(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
	function short(date, lang) { return date.toLocaleDateString(lang, { month: 'short', day: 'numeric' }); }
	function weekday(date, lang) { return date.toLocaleDateString(lang, { weekday: 'short' }); }
	function pct(done, total) { return total ? Math.round(done / total * 100) : 0; }

	function checkbox(index) {
		var key = dayKey(index);
		return '<input type="checkbox" class="reading-check" id="' + escapeAttr(key) + '"' + (isDone(index) ? ' checked' : '') + ' aria-label="Mark as read" />';
	}

	// A reading shared by two cards gets one real checkbox; the other card gets a label that toggles it
	function proxyCheckbox(index) {
		return '<label class="reading-check-proxy" for="' + escapeAttr(dayKey(index)) + '" aria-label="Mark as read"></label>';
	}

	function meter(percent) {
		return '<span class="meter" aria-hidden="true"><span style="width:' + percent + '%"></span></span>';
	}

	function sectionDot(section) {
		return '<span class="sec-dot section-' + section + '" aria-hidden="true"></span>';
	}

	/* Plan readings, grouped by book in the order the plan reaches them */
	function collect(data, lang) {
		var today = strip(new Date()),
			readings = [],
			books = [],
			byBook = {};

		data.days.forEach(function (day, index) {
			if (!day.formattedReading) {
				return;
			}
			var reading = { index: index, day: day, date: day.date, text: day.formattedReading, done: isDone(index) };
			readings.push(reading);

			var seen = {};
			day.chapters.forEach(function (chapter) {
				var info = bible.BIBLE_DATA[chapter.usfm];
				if (!info) {
					return;
				}
				var book = byBook[chapter.usfm];
				if (!book) {
					book = byBook[chapter.usfm] = {
						usfm: chapter.usfm,
						name: bible.getName(info, lang),
						section: bible.SECTIONS[info.section],
						chapters: {},
						readings: []
					};
					books.push(book);
				}
				book.chapters[chapter.chapter] = true;
				if (!seen[chapter.usfm]) {
					seen[chapter.usfm] = true;
					book.readings.push(reading);
				}
			});
		});

		books.forEach(function (book) {
			book.total = book.readings.length;
			book.done = book.readings.filter(function (r) { return r.done; }).length;
			book.first = book.readings[0].date;
			book.last = book.readings[book.total - 1].date;
			book.chapterCount = Object.keys(book.chapters).length;
			book.percent = pct(book.done, book.total);
			book.next = book.readings.filter(function (r) { return !r.done; })[0] || null;
			book.status = book.done === 0 ? 'todo' : book.done === book.total ? 'done' : 'doing';
			book.behind = book.status !== 'done' && strip(book.last) < today;
		});

		return {
			today: today,
			readings: readings,
			books: books,
			next: readings.filter(function (r) { return !r.done; })[0] || null
		};
	}

	function statusPill(book) {
		var key = book.behind ? 'behind' : book.status;
		return '<span class="status status-' + key + '">' + STATUS_LABELS[key] + '</span>';
	}

	/* 1. Matrix: one row per book */
	window.buildmatrix = function (lang, data) {
		var c = collect(data, lang);
		var rows = c.books.map(function (book) {
			return '<tr class="' + (book.status === 'done' ? 'is-complete' : '') + '">' +
				'<th scope="row">' + sectionDot(book.section) + esc(book.name) + '</th>' +
				'<td class="num">' + book.chapterCount + '</td>' +
				'<td class="col-scheduled">' + short(book.first, lang) + ' – ' + short(book.last, lang) + '</td>' +
				'<td' + (book.behind ? ' class="is-behind"' : '') + '>' + short(book.last, lang) + '</td>' +
				'<td class="col-progress">' + meter(book.percent) + '<span class="num">' + book.done + '/' + book.total + '</span></td>' +
				'<td>' + statusPill(book) + '</td>' +
				'</tr>';
		}).join('');

		return '<div class="layout-matrix"><table>' +
			'<thead><tr><th>Book</th><th>Chapters</th><th class="col-scheduled">Scheduled</th><th>Finish by</th><th>Readings</th><th>Status</th></tr></thead>' +
			'<tbody>' + rows + '</tbody></table></div>';
	};

	/* 2. Sections: readings grouped by part of the Bible, no dates */
	window.buildsections = function (lang, data) {
		var c = collect(data, lang), groups = {};

		c.readings.forEach(function (reading) {
			var first = reading.day.chapters[0],
				info = first && bible.BIBLE_DATA[first.usfm],
				section = info ? bible.SECTIONS[info.section] : '',
				group = SECTION_GROUPS.filter(function (g) { return g.sections.indexOf(section) > -1; })[0] || SECTION_GROUPS[0];
			(groups[group.id] = groups[group.id] || { group: group, section: section, items: [] }).items.push(reading);
		});

		var html = SECTION_GROUPS.filter(function (g) { return groups[g.id]; }).map(function (g) {
			var entry = groups[g.id],
				done = entry.items.filter(function (r) { return r.done; }).length;
			return '<section class="sec-group">' +
				'<header>' + sectionDot(entry.section) + '<h4>' + g.label + '</h4><span class="num">' + done + ' of ' + entry.items.length + '</span></header>' +
				'<ol>' + entry.items.map(function (reading) {
					var isNext = c.next && c.next.index === reading.index;
					return '<li class="sec-item' + (reading.done ? ' is-done' : '') + (isNext ? ' is-next' : '') + '">' +
						checkbox(reading.index) + createReadingButton(reading.day, dayKey(reading.index)) +
						(isNext ? '<span class="next-tag">Up next</span>' : '') + '</li>';
				}).join('') + '</ol></section>';
		}).join('');

		return '<div class="layout-sections">' + html + '</div>';
	};

	/* 3. Progress: totals, then a bar per book */
	window.buildprogress = function (lang, data) {
		var c = collect(data, lang),
			done = c.readings.filter(function (r) { return r.done; }),
			verses = 0, versesDone = 0, words = 0, wordsDone = 0;

		c.readings.forEach(function (r) {
			verses += r.day.versesForToday || 0;
			words += r.day.wordsForToday || 0;
			if (r.done) {
				versesDone += r.day.versesForToday || 0;
				wordsDone += r.day.wordsForToday || 0;
			}
		});

		var overall = pct(done.length, c.readings.length),
			minutes = Math.round((wordsDone || versesDone * 26) / 230);

		var stats = '<div class="progress-summary">' +
			'<div class="ps-main"><strong class="num">' + overall + '%</strong><span>complete</span>' + meter(overall) + '</div>' +
			'<dl>' +
			'<div><dt>Readings</dt><dd class="num">' + done.length.toLocaleString() + ' <small>/ ' + c.readings.length.toLocaleString() + '</small></dd></div>' +
			'<div><dt>Verses</dt><dd class="num">' + versesDone.toLocaleString() + ' <small>/ ' + verses.toLocaleString() + '</small></dd></div>' +
			'<div><dt>Time read</dt><dd class="num">' + (minutes >= 60 ? Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm' : minutes + ' min') + '</dd></div>' +
			'<div><dt>Books finished</dt><dd class="num">' + c.books.filter(function (b) { return b.status === 'done'; }).length + ' <small>/ ' + c.books.length + '</small></dd></div>' +
			'</dl></div>';

		var rows = c.books.map(function (book) {
			return '<div class="pb-row' + (book.status === 'done' ? ' is-complete' : '') + '">' +
				'<span class="pb-name">' + sectionDot(book.section) + esc(book.name) + '</span>' +
				'<span class="pb-bar">' + meter(book.percent) + '</span>' +
				'<span class="pb-count num">' + book.done + '/' + book.total + '</span>' +
				'<span class="pb-pct num">' + book.percent + '%</span>' +
				'</div>';
		}).join('');

		return '<div class="layout-progress">' + stats + '<div class="pb-list">' + rows + '</div></div>';
	};

	/* 4. Board: To read, Reading now, Finished */
	window.buildboard = function (lang, data) {
		var c = collect(data, lang),
			rendered = {},
			columns = [['todo', 'To read'], ['doing', 'Reading now'], ['done', 'Finished']];

		function card(book) {
			var next = '';
			if (book.next) {
				var r = book.next;
				next = '<div class="board-next">' + (rendered[r.index] ? proxyCheckbox(r.index) : checkbox(r.index)) + createReadingButton(r.day, dayKey(r.index)) +
					'<small>' + short(r.date, lang) + '</small></div>';
				rendered[r.index] = true;
			}
			return '<article class="board-card status-' + book.status + '" data-book="' + book.usfm + '">' +
				'<div class="board-card-top">' + sectionDot(book.section) + '<strong>' + esc(book.name) + '</strong>' +
				'<span class="num">' + book.done + '/' + book.total + '</span></div>' +
				meter(book.percent) + next + '</article>';
		}

		return '<div class="layout-board">' + columns.map(function (col) {
			var books = c.books.filter(function (b) { return b.status === col[0]; });
			return '<section class="board-col" data-col="' + col[0] + '">' +
				'<header><h4>' + col[1] + '</h4><span class="num">' + books.length + '</span></header>' +
				'<div class="board-cards">' + (books.length ? books.map(card).join('') : '<p class="board-empty">Nothing here yet</p>') + '</div>' +
				'</section>';
		}).join('') + '</div>';
	};

	/* 5. Week rows: one row per week with every reading in it */
	window.buildweekrows = function (lang, data) {
		var c = collect(data, lang), weeks = [], current = null;

		c.readings.forEach(function (reading) {
			var start = strip(reading.date);
			start.setDate(start.getDate() - start.getDay());
			if (!current || current.start.getTime() !== start.getTime()) {
				current = { start: start, items: [] };
				weeks.push(current);
			}
			current.items.push(reading);
		});

		var rows = weeks.map(function (week, n) {
			var end = new Date(week.start); end.setDate(end.getDate() + 6);
			var done = week.items.filter(function (r) { return r.done; }).length,
				complete = done === week.items.length,
				isThisWeek = c.today >= week.start && c.today <= end;
			return '<tr class="' + (complete ? 'is-complete' : '') + (isThisWeek ? ' is-current' : '') + '">' +
				'<th scope="row">Week ' + (n + 1) + '<small>' + short(week.start, lang) + ' – ' + short(end, lang) + '</small></th>' +
				'<td><ul class="wr-items">' + week.items.map(function (r) {
					return '<li class="' + (r.done ? 'is-done' : '') + (sameDay(r.date, c.today) ? ' is-today' : '') + '">' + checkbox(r.index) +
						'<span class="wr-day">' + weekday(r.date, lang) + '</span>' + createReadingButton(r.day, dayKey(r.index)) + '</li>';
				}).join('') + '</ul></td>' +
				'<td class="wr-done num">' + done + '/' + week.items.length + '</td>' +
				'</tr>';
		}).join('');

		return '<div class="layout-weekrows"><table><thead><tr><th>Week</th><th>Readings</th><th>Done</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
	};

	function sameDay(a, b) { return isSameDay(a, b); }

	/* 6. Habit: a check per day and streaks, no titles */
	window.buildhabit = function (lang, data) {
		var c = collect(data, lang),
			run = 0, best = 0, bestRun = 0, current = 0, due = 0, doneCount = 0;

		// Walk the plan in order. Reading ahead extends the streak; a missed reading that was
		// due before today breaks it; the first unread reading from today on ends the walk.
		var walking = true;
		c.readings.forEach(function (r) {
			var isDue = strip(r.date) <= c.today;
			if (isDue) due++;
			if (r.done) doneCount++;
			// best streak: readings done back to back, in plan order
			bestRun = r.done ? bestRun + 1 : 0;
			best = Math.max(best, bestRun);
			if (r.done) {
				run++;
			} else if (strip(r.date) < c.today) {
				run = 0;
			} else if (walking) {
				current = run;
				walking = false;
			}
		});
		if (walking) current = run;

		var pace = doneCount - due,
			paceLabel = pace > 0 ? pace + ' ahead' : pace < 0 ? (-pace) + ' behind' : 'On track';

		var stats = '<div class="habit-stats">' +
			'<div><strong class="num">' + current + '</strong><span>reading streak</span></div>' +
			'<div><strong class="num">' + best + '</strong><span>best streak</span></div>' +
			'<div><strong class="num">' + doneCount + '<small>/' + c.readings.length + '</small></strong><span>readings done</span></div>' +
			'<div class="habit-pace' + (pace < 0 ? ' is-behind' : '') + '"><strong>' + paceLabel + '</strong><span>pace</span></div>' +
			'</div>';

		var byDate = {}, months = [];
		c.readings.forEach(function (r) {
			byDate[strip(r.date).getTime()] = r;
			var m = r.date.getFullYear() + '-' + r.date.getMonth();
			if (months.indexOf(m) < 0) months.push(m);
		});
		var letters = [];
		for (var w = 0; w < 7; w++) {
			letters.push('<span>' + new Date(2023, 0, 1 + w).toLocaleDateString(lang, { weekday: 'narrow' }) + '</span>');
		}

		var grids = months.map(function (m) {
			var parts = m.split('-'), year = +parts[0], month = +parts[1],
				first = new Date(year, month, 1), count = new Date(year, month + 1, 0).getDate(),
				cells = [];
			for (var b = 0; b < first.getDay(); b++) cells.push('<span class="hd is-blank"></span>');
			for (var d = 1; d <= count; d++) {
				var date = new Date(year, month, d), r = byDate[date.getTime()],
					cls = (date > c.today ? ' is-future' : '') + (sameDay(date, c.today) ? ' is-today' : '');
				cells.push(r
					? '<label class="hd is-reading' + cls + '" title="' + escapeAttr(short(date, lang) + ': ' + r.text) + '">' + checkbox(r.index) + '<span class="hd-n">' + d + '</span></label>'
					: '<span class="hd is-rest' + cls + '"><span class="hd-n">' + d + '</span></span>');
			}
			return '<section class="habit-month"><h4>' + first.toLocaleDateString(lang, { month: 'long', year: 'numeric' }) + '</h4>' +
				'<div class="habit-grid"><div class="habit-letters">' + letters.join('') + '</div><div class="habit-days">' + cells.join('') + '</div></div></section>';
		}).join('');

		return '<div class="layout-habit">' + stats + '<div class="habit-months">' + grids + '</div></div>';
	};
})();
