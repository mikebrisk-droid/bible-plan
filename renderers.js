

function buildlist(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates, includeUrls) {
	
	var html = [],
		today = new Date();

	html.push('<div class="plan-list">');
		
	var days = data.days,
		lastMonth = -1,
		monthOpen = false;

	for (var i=0; i<days.length; i++) {
		var dayInfo = days[i],
			bookInfo = dayInfo.chapters.length > 0 ? bible.BIBLE_DATA[dayInfo.chapters[0].usfm] : null;

		var dayKey = currentKey + '-' + i.toString();

		// rest days have nothing to show in a list
		if (dayInfo.formattedReading == '') {
			continue;
		}

		if (lastMonth != dayInfo.date.getMonth() && !noDates) {
			if (monthOpen) {
				html.push('</div>');
			}
			html.push('<div class="month-block">');
			// January also shows its year ("January 2027") so a new year is obvious when scrolling
			html.push('<div class="month-divider">' + (dayInfo.date.getMonth() == 0
				? dayInfo.date.toLocaleDateString(lang, {month: 'long', year: 'numeric'})
				: dayInfo.date.monthName(lang)) + '</div>');
			monthOpen = true;
		}

		html.push('<div class="entry ' + (isSameDay(today, dayInfo.date) ? ' is-today': '') + ' section-' + (bookInfo != null ? bible.SECTIONS[bookInfo.section] : '') + '">');
		//html.push('<span>' + formatChapterRange(dayInfo.chapters) + '</span>');		
		if (dayInfo.formattedReading != '') {
			var readingButton = createReadingButton(dayInfo);

			html.push(
			`<div class="verses"> 
				<input type="checkbox" class="reading-check" id="${dayKey}" ${getLocalStorage(dayKey, false) === 'true' ? " checked" : ""} />
			</div>
			<div class="date">${noDates ? '' : dayInfo.date.monthAbbr(lang) + ' ' + (dayInfo.date.getDate())}</div>
			<div class="passage-cell">
				${readingButton}
			</div>
			<div class="reading-meta">${formatReadingMeta(dayInfo)}</div>`);

			//html.push('<div class="verses">' + (includeUrls ? dayInfo.formattedReadingUrls : dayInfo.formattedReading) + '</div>');		
		}
		html.push('</div>');

		lastMonth = dayInfo.date.getMonth();
	}

	if (monthOpen) {
		html.push('</div>');
	}

	html.push('</div>');
	
	if (showStats) {
		html.unshift(createFinalStats(data.days, lang));
	}	
	
	return html.join('\n');
	
}

function buildweeks(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates, includeUrls) {
	
	var html = [],
		weekNumber = 1,
		today = new Date();

	html.push('<div class="plan-weeks">');

	// open first one
	html.push('<div class="week-block">');
	html.push('<div class="entry"><span class="week">Week ' + weekNumber + "</span></div>");
	weekNumber++;
		
	var days = data.days;
	for (var i=0; i<days.length; i++) {
		var dayInfo = days[i],
			bookInfo = dayInfo.chapters.length > 0 ? bible.BIBLE_DATA[dayInfo.chapters[0].usfm] : null;

			var dayKey = currentKey + '-' + i.toString();

		if (dayInfo.date.getDay() == 0 && i > 0) {
			html.push('</div>');
			html.push('<div class="week-block">');
			html.push('<div class="entry"><span class="week">Week ' + weekNumber + "</span></div>");
			weekNumber++;
		}

		if (dayInfo.formattedReading == '') {
			continue;
		}
			
		html.push('<div class="entry ' + (isSameDay(today, dayInfo.date) ? ' is-today': '') + ' section-' + (bookInfo != null ? bible.SECTIONS[bookInfo.section] : '') + '">');
		html.push('<div class="date">' + (noDates ? '' : dayInfo.date.monthAbbr(lang) + ' ' + (dayInfo.date.getDate())) + '</div>');		
		
		if (dayInfo.formattedReading != '') {
			var readingButton = createReadingButton(dayInfo);
			html.push(
				`<div class="verses"> 
					<input type="checkbox" class="reading-check" id="${dayKey}" ${getLocalStorage(dayKey, false) === 'true' ? " checked" : ""} />
					${readingButton}
				</div>`);			
			//html.push('<div class="verses">' + (includeUrls ? dayInfo.formattedReadingUrls : dayInfo.formattedReading) + '</div>');		
		}
		html.push('</div>');
	}
	// close week
	html.push('</div>');

	// close list
	html.push('</div>');
	
	if (showStats) {
		html.unshift(createFinalStats(data.days, lang))
	}	
	
	return html.join('\n');
	
}

function isSameDay(d1, d2) {
	return d1.getFullYear() === d2.getFullYear() &&
	  d1.getDate() === d2.getDate() &&
	  d1.getMonth() === d2.getMonth();
  }

function formatReadingMeta(dayInfo) {
	var meta = [];

	if (dayInfo.versesForToday > 0) {
		meta.push(dayInfo.versesForToday + ' verses');
	}
	if (dayInfo.wordsForToday > 0) {
		var minutes = Math.max(1, Math.round(dayInfo.wordsForToday / 250));
		meta.push(dayInfo.wordsForToday.toLocaleString() + ' words');
		meta.push(minutes + ' min read');
	}

	return meta.join(' · ');
}

function createReadingButton(dayInfo) {
	var url = getReadingUrl(dayInfo);

	return `<button type="button" class="reading-open" data-reading-url="${escapeAttr(url)}" data-reading-title="${escapeAttr(dayInfo.formattedReading)}" data-reading-refs="${escapeAttr(getYouVersionRefs(dayInfo))}">${escapeHtml(dayInfo.formattedReading)}</button>`;
}

function getReadingUrl(dayInfo) {
	var match = dayInfo.formattedReadingUrls && dayInfo.formattedReadingUrls.match(/href="([^"]+)"/);

	return match ? match[1] : '';
}

function escapeHtml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function escapeAttr(value) {
	return escapeHtml(value).replace(/`/g, '&#096;');
}

function getYouVersionRefs(dayInfo) {
	var references = [];

	dayInfo.chapters.forEach(function(chapter) {
		references.push(chapter.usfm + '.' + chapter.chapter);
	});

	return references.join(',');
}

function buildics(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates, includeUrls) {
	

	var ics = [];	
	
	ics.push('BEGIN:VCALENDAR');
	ics.push('VERSION:2.0');
	ics.push('PRODID:-//hacksw/handcal//NONSGML v1.0//EN');

	function formatDate(date) {
		return date.getFullYear().toString() + 
				(date.getMonth()+1).toString().padStart(2,'0') + 
				date.getDate().toString().padStart(2,'0');
	}
		
	var days = data.days;
	for (var i=0; i<days.length; i++) {
		var dayInfo = days[i],
			startFormatted = formatDate(dayInfo.date),
			endDate = dayInfo.date.addDays(1),
			endFormatted = formatDate(endDate);
		
		if (dayInfo.formattedReading != '' && dayInfo.formattedReading != '---') {
			ics.push('BEGIN:VEVENT');
			//ics.push('DTSTAMP:' + startFormatted + 'T000000Z');
			ics.push('DTSTART;VALUE=DATE:' + startFormatted + '');
			ics.push('DTEND;VALUE=DATE:' + endFormatted + '');
			ics.push('SUMMARY:' + dayInfo.formattedReading);	
			if (includeUrls) {
				ics.push('X-ALT-DESC;FMTTYPE=text/html:<!doctype html><html><body>' + dayInfo.formattedReadingUrls + '</body></html>');
			}	
			ics.push('END:VEVENT');
		}
	}

	ics.push('END:VCALENDAR');

	return ics.join('\n');
	
}

function buildcsv(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats) {

	let csv = [];
	
	csv.push('"Date","Passage"' + (showStats ? ',"Verse Count"' : ''));
		
	for (var i=0; i<data.days.length; i++) {
		let dayInfo = data.days[i],
			formattedDate = dayInfo.date.getFullYear().toString() + '-' +
							(dayInfo.date.getMonth()+1).toString().padStart(2,'0') +  '-' +
							dayInfo.date.getDate().toString().padStart(2,'0');
			

		csv.push('"' + formattedDate + '","' + dayInfo.formattedReading + '"' + (showDailyStats ? ',"' + dayInfo.versesForToday + '"' : ''));
	}

	return csv.join('\n');
}



// One calendar per month, like a wall calendar: every date of the month in place, plan days
// filled in, dates outside the plan faded. "Remove dates" keeps the old undated running grid.
function buildcalendar(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates, includeUrls) {

	if (noDates) {
		return buildcalendarContinuous(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates, includeUrls);
	}

	var today = new Date(),
		html = [],
		byDate = {},
		months = [];

	function key(date) {
		return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
	}

	data.days.forEach(function(dayInfo, index) {
		byDate[key(dayInfo.date)] = { dayInfo: dayInfo, index: index };
		var monthKey = dayInfo.date.getFullYear() + '-' + dayInfo.date.getMonth();
		if (months.indexOf(monthKey) < 0) {
			months.push(monthKey);
		}
	});

	// weekday names, Sunday first, in the plan's language
	var weekdays = [],
		sunday = new Date(2023, 0, 1);
	for (var w = 0; w < 7; w++) {
		weekdays.push('<th>' + sunday.addDays(w).toLocaleDateString(lang, {weekday: 'long'}) + '</th>');
	}

	html.push('<div class="plan-calendars">');

	months.forEach(function(monthKey) {
		var parts = monthKey.split('-'),
			year = parseInt(parts[0], 10),
			month = parseInt(parts[1], 10),
			first = new Date(year, month, 1),
			daysInMonth = new Date(year, month + 1, 0).getDate(),
			cells = [];

		for (var blank = 0; blank < first.getDay(); blank++) {
			cells.push('<td class="is-blank"></td>');
		}

		for (var d = 1; d <= daysInMonth; d++) {
			var date = new Date(year, month, d),
				entry = byDate[key(date)];

			if (!entry) {
				cells.push('<td class="is-outside"><span class="date">' + d + '</span></td>');
				continue;
			}

			var dayInfo = entry.dayInfo,
				bookInfo = dayInfo.chapters.length > 0 ? bible.BIBLE_DATA[dayInfo.chapters[0].usfm] : null,
				dayKey = currentKey + '-' + entry.index,
				classes = (bookInfo != null ? 'section-' + bible.SECTIONS[bookInfo.section] : '') + (isSameDay(today, date) ? ' is-today' : '');

			cells.push('<td class="' + classes + '"><span class="date">' + d + '</span>' +
				(dayInfo.formattedReading != '' ?
					`<span class="verses">
						<input type="checkbox" class="reading-check" id="${dayKey}" ${getLocalStorage(dayKey, false) === 'true' ? " checked" : ""} />
						${createReadingButton(dayInfo)}
					</span>` +
					(showDailyStats ?
						'<span class="stats">verses: ' + dayInfo.versesForToday + '<br>' +
							(dayInfo.wordsForToday > 0 ? 'words: ' + dayInfo.wordsForToday + '<br>minutes: ' + (dayInfo.wordsForToday/250).toFixed(2) : '') +
						'</span>'
						: '')
					: '') +
			'</td>');
		}

		while (cells.length % 7 !== 0) {
			cells.push('<td class="is-blank"></td>');
		}

		html.push('<section class="calendar-month">');
		html.push('<h3 class="calendar-month-title">' + first.toLocaleDateString(lang, {month: 'long', year: 'numeric'}) + '</h3>');
		html.push('<table class="plan-calendar"><thead><tr>' + weekdays.join('') + '</tr></thead><tbody>');
		for (var r = 0; r < cells.length; r += 7) {
			html.push('<tr>' + cells.slice(r, r + 7).join('') + '</tr>');
		}
		html.push('</tbody></table></section>');
	});

	html.push('</div>');

	if (showStats) {
		html.unshift(createFinalStats(data.days, lang));
	}

	return html.join('\n');
}

function buildcalendarContinuous(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates, includeUrls) {
	
	//var daysOfWeek = ['Sunday','Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	
	var html = [],
		today = new Date();

	html.push('<table class="plan-calendar">');
	
	// create calendar weekday heading
	html.push('<thead><tr>');
	var firstSunday = new Date();
	while (firstSunday.getDay() > 0) {
		firstSunday = firstSunday.addDays(-1);
	}
	for (var i=0; i<7; i++) {		
		var dayOfWeek = firstSunday.addDays(i);		
		html.push('<th>' + dayOfWeek.toLocaleDateString(lang, {weekday:"long"}) + '</th>');		
	}	
	
	html.push('</tr></thead>');
	
	// fill in until Sunday
	var lengthBeforeSetToSunday = data.days.length;
	var days = appendDaysToSunday(data.days);
	var numberOfDaysAdded = data.days.length - lengthBeforeSetToSunday;
	
	html.push('<tbody>');
	
	var weekNumber = 1,
		lastMonth = -1;
	for (var i=0; i<days.length; i++) {
		var dayInfo = days[i],
			bookInfo = dayInfo.chapters.length > 0 ? bible.BIBLE_DATA[dayInfo.chapters[0].usfm] : null;
		
		// open on sunday
		if (dayInfo.date.getDay() == 0) {
			html.push('<tr>');
			//html.push('<th>' + weekNumber + '</th>');
		}

		var firstdayofmonth = new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth(), 1);
		var lastdayofmonth = new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth()+1, 0);
		var firstday = (dayInfo.date.getDate() == 1);
		var lastday = (dayInfo.date.getDate() == lastdayofmonth.getDate()  );
		
		var firstdayofweek = firstdayofmonth.getDay();
		var lastdayofweek = lastdayofmonth.getDay();
		var firstweek = dayInfo.date.getDate() < 7 && dayInfo.date.getDay() < 8 - firstdayofweek;
		var lastweek = dayInfo.date.getDate() > lastdayofmonth.getDate()-7; //  && dayInfo.date.getDay() < 8 - lastdayofweek;;
		
		var dayKey = currentKey + '-' + (i-numberOfDaysAdded).toString();

		html.push('<td class="' + 
					(bookInfo != null ? 'section-' + bible.SECTIONS[bookInfo.section] : '') + 
					(!noDates && firstday ? ' monthstart' : '') + 
					(!noDates && lastday ? ' monthend' : '') + 
					(!noDates && firstweek ? ' firstweek' : '') + 
					(!noDates && lastweek ? ' lastweek' : '') + 
					(!noDates && isSameDay(today, dayInfo.date) ? ' is-today': '') +
			'">' + 
			'<span class="date">' + (noDates ? '' : (firstday ? dayInfo.date.monthAbbr(lang) + ' ' : '') + dayInfo.date.getDate()) + '</span>' + 
			//'<span class="verses">' + formatChapterRange(dayInfo.chapters) + '</span>' + 
			(dayInfo.formattedReading != '' ? 
				`<span class="verses"> 
					<input type="checkbox" class="reading-check" id="${dayKey}" ${getLocalStorage(dayKey, false) === 'true' ? " checked" : ""} />
					${createReadingButton(dayInfo)}
				</span>` +
				(showDailyStats ?
					'<span class="stats">' +
						'verses: ' + dayInfo.versesForToday + '<br>' +
						(dayInfo.wordsForToday > 0 ? 
							'words: ' + dayInfo.wordsForToday + '<br>' +					
							'minutes: ' + (dayInfo.wordsForToday/250).toFixed(2)
							: 
							''
						) + 						
					'</span>' 
					: '')
				: '') + 
			
		'</td>');		
		
		// close on saturday
		if (dayInfo.date.getDay() == 6) {
			html.push('</tr>');
			weekNumber++;
		}
		
		lastMonth = dayInfo.date.getMonth()		
	}
	html.push('</tbody>');
	html.push('</table>');

	if (showStats) {
		html.unshift(createFinalStats(data.days, lang))
	}
	
	
	return html.join('\n');
	
}

/* Overall plan stats. Collapsed, they are a row of figure tiles in the plan; tapping the row grows it
   into a full view of widget cards (the tiles become the hero card), and Back shrinks it home again. */
var STAT_SECTIONS = [
	{ name: 'Law', sections: [0] },
	{ name: 'History', sections: [1] },
	{ name: 'Wisdom', sections: [2] },
	{ name: 'Prophets', sections: [3, 4] },
	{ name: 'Gospels & Acts', sections: [5, 6] },
	{ name: 'Letters', sections: [7, 8, 9] },
	{ name: 'Revelation', sections: [10] },
	{ name: 'Apocrypha', sections: [11] }
];
var WORDS_PER_MINUTE = 230, WORDS_PER_VERSE = 26;
var lastPlanStats = null;

function statNumber(n) {
	return n >= 10000 ? (Math.round(n / 100) / 10).toLocaleString() + 'K' : Math.round(n).toLocaleString();
}

function statDuration(minutes) {
	minutes = Math.round(minutes);
	if (minutes < 60) return { value: Math.max(1, minutes), unit: 'min' };
	var hours = minutes / 60;
	return { value: hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours), unit: 'hr' };
}

function statMin(minutes) { return Math.max(1, Math.round(minutes)); }
function statDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function statDate(date, opts) { return date.toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric' }); }
function statDone(index) {
	try { return typeof getLocalStorage === 'function' && getLocalStorage(window.currentKey + '-' + index, false) === 'true'; }
	catch (e) { return false; }
}

/* Everything the tiles and cards show, worked out once from the plan's days */
function planStatsModel(days, lang) {
	var readings = [], books = {}, chapters = {}, verses = 0, hasWords = true;

	days.forEach(function (day, index) {
		if (!(day.versesForToday > 0)) return;
		if (!(day.wordsForToday > 0)) hasWords = false;
		readings.push({ day: day, index: index, date: statDay(day.date) });
		verses += day.versesForToday;
		(day.chapters || []).forEach(function (c) {
			var key = c.usfm + '.' + c.chapter;
			if (!chapters[key]) {
				chapters[key] = c;
				books[c.usfm] = (books[c.usfm] || 0) + 1;
			}
		});
	});
	if (!readings.length) return null;

	// minutes come from word counts; languages without them fall back to an average verse length
	var totalMinutes = 0;
	readings.forEach(function (r) {
		r.minutes = (hasWords ? r.day.wordsForToday : r.day.versesForToday * WORDS_PER_VERSE) / WORDS_PER_MINUTE;
		r.done = statDone(r.index);
		totalMinutes += r.minutes;
	});

	var today = statDay(new Date()), first = readings[0].date, last = readings[readings.length - 1].date,
		due = readings.filter(function (r) { return r.date <= today; }),
		behind = due.filter(function (r) { return !r.done && r.date < today; }),
		byLength = readings.slice().sort(function (a, b) { return b.minutes - a.minutes; });

	return {
		days: days, lang: lang, readings: readings, verses: verses,
		books: books, chapters: chapters,
		totalMinutes: totalMinutes, avgMinutes: totalMinutes / readings.length,
		longest: byLength[0], shortest: byLength[byLength.length - 1], byLength: byLength,
		today: today, first: first, last: last,
		status: today < first ? 'upcoming' : today > last ? 'finished' : 'active',
		due: due, behind: behind,
		done: readings.filter(function (r) { return r.done; }),
		todayReading: readings.filter(function (r) { return +r.date === +today; })[0] || null
	};
}

function statTiles(m) {
	var perDay = statDuration(m.avgMinutes), total = statDuration(m.totalMinutes);
	return [
		['Reading days', statNumber(m.readings.length)],
		['Books', statNumber(Object.keys(m.books).length)],
		['Chapters', statNumber(Object.keys(m.chapters).length)],
		['Verses', statNumber(m.verses)],
		['Per day', perDay.value + ' <small>' + perDay.unit + '</small>'],
		['Total time', total.value + ' <small>' + total.unit + '</small>']
	];
}

var STAT_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function createFinalStats(days, lang) {
	var m = planStatsModel(days, lang);
	if (!m) return '';
	lastPlanStats = { days: days, lang: lang };
	return '<div class="plan-stats" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Open plan stats" data-stats-open>' +
		'<dl class="ps-tiles">' + statTiles(m).map(function (t) {
			return '<div><dt>' + t[0] + '</dt><dd>' + t[1] + '</dd></div>';
		}).join('') + '</dl>' +
		'<span class="ps-open-icon" aria-hidden="true">' + STAT_ARROW + '</span>' +
		'</div>';
}

/* ---------- The full view ---------- */

function statCard(key, dot, title, meta, body, foot) {
	return '<article class="ps-card ps-c-' + key + '" style="--dot:var(--ps-' + dot + ')">' +
		'<header><h3><i></i>' + title + '</h3><span>' + meta + '</span></header>' +
		'<div class="ps-card-body">' + body + '</div>' +
		(foot ? '<p class="ps-card-foot">' + foot + '</p>' : '') +
		'<div class="ps-tip" hidden></div>' +
		'</article>';
}

function statFigure(value, unit, label) {
	var count = typeof value === 'number' ? ' data-n="' + value + '"' : '';
	return '<p class="ps-figure">' + (label ? '<small>' + label + '</small>' : '') + '<b' + count + '>' + (typeof value === 'number' ? value.toLocaleString() : value) + '</b>' + (unit ? '<span>' + unit + '</span>' : '') + '</p>';
}

function statHero(m) {
	var name = (document.getElementById('plan-name') || {}).textContent || 'My plan',
		range = statDate(m.first, { month: 'short', day: 'numeric' }) + ' – ' + statDate(m.last, { month: 'short', day: 'numeric', year: 'numeric' }),
		total = m.readings.length, figure, line;

	if (m.status === 'upcoming') {
		var until = Math.round((m.first - m.today) / 864e5);
		figure = statFigure(until, until === 1 ? 'day' : 'days', 'Starts in');
		line = 'Starts <em>' + escapeHtml(statDate(m.first, { weekday: 'short', month: 'short', day: 'numeric' })) + '</em>,<br>about ' + statMin(m.avgMinutes) + ' min a day.';
	} else if (m.status === 'finished') {
		figure = statFigure(total, 'days', 'Finished');
		line = '<em>Finished</em> ' + escapeHtml(statDate(m.last)) + ',<br>' + m.done.length.toLocaleString() + ' of ' + total.toLocaleString() + ' read.';
	} else {
		figure = statFigure(Math.max(1, m.due.length), 'of ' + total.toLocaleString(), 'Day');
		var t = m.todayReading;
		// only count readings as missed once someone is checking them off
		if (m.behind.length && m.done.length) {
			var catchUp = statDuration(m.behind.reduce(function (s, r) { return s + r.minutes; }, 0));
			line = 'You’re <em>' + m.behind.length + (m.behind.length === 1 ? ' reading' : ' readings') + ' behind</em>,<br>about ' + catchUp.value + ' ' + catchUp.unit + ' to catch up.';
		} else if (t && !t.done) {
			line = 'Today is <em>' + escapeHtml(t.day.formattedReading) + '</em>,<br>about ' + statMin(t.minutes) + ' min.';
		} else if (t) {
			line = 'Today’s reading is <em>done</em>,<br>' + (total - m.due.length) + ' to go.';
		} else {
			var next = m.readings.filter(function (r) { return r.date > m.today; })[0];
			line = '<em>Rest day</em> today,<br>next up ' + escapeHtml(statDate(next.date, { weekday: 'long' })) + '.';
		}
	}

	// the next week of readings, like an hourly forecast
	var start = m.status === 'finished' ? Math.max(0, total - 7) : Math.max(0, m.readings.indexOf(m.readings.filter(function (r) { return r.date >= m.today; })[0]));
	var strip = m.readings.slice(start, start + 7).map(function (r) {
		var days = Math.round((r.date - m.today) / 864e5),
			when = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days > 1 && days < 7 ? statDate(r.date, { weekday: 'short' }) : statDate(r.date);
		return '<li class="' + (days === 0 ? 'is-now ' : '') + (r.done ? 'is-done' : '') + '">' +
			'<span>' + when + '</span><b>' + escapeHtml(r.day.formattedReading) + '</b><em>' + (r.done ? '✓ ' : '') + statMin(r.minutes) + ' min</em></li>';
	}).join('');

	return '<section class="ps-hero">' +
		'<header><strong>' + escapeHtml(name) + '</strong><span>' + range + '</span></header>' +
		'<div class="ps-hero-main">' + figure + '<p class="ps-hero-line">' + line + '</p></div>' +
		'<ol class="ps-strip">' + strip + '</ol>' +
		'<p class="ps-hero-foot">' + statTiles(m).map(function (t) { return t[1].replace(/<[^>]+>/g, '') + ' ' + t[0].toLowerCase(); }).join(' · ') + '</p>' +
		'</section>';
}

function statDailyPlot(m) {
	var days = m.days, readings = m.readings,
		first = readings[0].index, last = readings[readings.length - 1].index,
		span = last - first + 1, byIndex = {},
		maxMinutes = m.longest.minutes,
		step = [5, 10, 15, 20, 30, 60, 120, 240].filter(function (n) { return Math.ceil(maxMinutes / n) <= 4; })[0] || 480,
		top = Math.max(step, Math.ceil(maxMinutes / step) * step);

	readings.forEach(function (r) { byIndex[r.index] = r; });

	var bars = [];
	for (var i = first; i <= last; i++) {
		var r = byIndex[i], day = days[i];
		if (!r) { bars.push('<i class="is-rest" data-d="' + escapeAttr(statDate(day.date)) + '"></i>'); continue; }
		bars.push('<i' + (+r.date === +m.today ? ' class="ps-today"' : '') +
			' style="--h:' + (r.minutes / top * 100).toFixed(2) + '%"' +
			' data-d="' + escapeAttr(statDate(day.date)) + '"' +
			' data-r="' + escapeAttr(day.formattedReading) + '"' +
			' data-v="' + day.versesForToday + '"' +
			' data-m="' + statMin(r.minutes) + '"></i>');
	}

	var grid = '';
	for (var t = step; t <= top; t += step) {
		// a tick label too close to the average line would collide with its label
		var label = Math.abs(t - m.avgMinutes) / top < 0.12 ? '' : '<b>' + t + (t === top ? ' min' : '') + '</b>';
		grid += '<span style="bottom:' + (t / top * 100).toFixed(2) + '%">' + label + '</span>';
	}

	// month starts along the bottom, thinned so they never crowd
	var months = [], ticks = '';
	for (i = first; i <= last; i++) {
		if (i === first || days[i].date.getDate() === 1) months.push(i);
	}
	if (months.length > 1) {
		var every = Math.ceil(months.length / 12), shown = 0;
		months.forEach(function (idx, n) {
			if (n % every) return;
			if (idx === first && days[idx].date.getDate() > 20 && months.length > 2) return;
			// every other label drops out on narrow screens
			ticks += '<span' + (shown++ % 2 ? ' class="is-alt"' : '') + ' style="left:' + ((idx - first) / span * 100).toFixed(2) + '%">' +
				statDate(days[idx].date, { month: 'short' }) + '</span>';
		});
	} else {
		ticks = '<span style="left:0">' + statDate(days[first].date) + '</span>' +
			'<span style="right:0">' + statDate(days[last].date) + '</span>';
	}

	return '<div class="ps-plot">' +
			'<div class="ps-grid" aria-hidden="true">' + grid + '</div>' +
			'<div class="ps-avg" style="bottom:' + (m.avgMinutes / top * 100).toFixed(2) + '%" aria-hidden="true"><b>avg ' + statMin(m.avgMinutes) + '</b></div>' +
			'<div class="ps-bars' + (span > 120 ? ' is-dense' : '') + '" role="img" aria-label="Reading length for each day, from ' +
				statMin(m.shortest.minutes) + ' to ' + statMin(maxMinutes) + ' minutes">' + bars.join('') + '</div>' +
		'</div>' +
		'<div class="ps-months" aria-hidden="true">' + ticks + '</div>';
}

function statTimeCard(m) {
	var total = statDuration(m.totalMinutes);
	return statCard('time', 2, 'Reading time', m.readings.length.toLocaleString() + ' days',
		statFigure(statMin(m.avgMinutes), 'min a day') + statDailyPlot(m),
		'Longest ' + statDate(m.longest.date) + ' · ' + statMin(m.longest.minutes) + ' min · ' + total.value + ' ' + total.unit + ' in all');
}

function statTimelineCard(m) {
	var total = m.readings.length, done = m.done.length, behind = m.behind.length,
		left = total - m.due.length, figure,
		pct = function (n) { return (n / total * 100).toFixed(2) + '%'; };

	if (m.status === 'upcoming') figure = statFigure(Math.round((m.first - m.today) / 864e5), 'days to start');
	else figure = statFigure(left, left === 1 ? 'day left' : 'days left');

	var bar = '<div class="ps-track" role="img" aria-label="' + done + ' read, ' + behind + ' behind, ' + left + ' to go">' +
		'<span class="is-read" style="width:' + pct(done) + '"></span>' +
		'<span class="is-behind" style="width:' + pct(behind) + '"></span>' +
		(m.status === 'active' ? '<i style="left:' + pct(m.due.length) + '"></i>' : '') +
		'</div>';

	var cols = [['Starts', statDate(m.first), ''], ['Ends', statDate(m.last), ''], ['Read', done.toLocaleString(), 'is-read'], ['Behind', behind.toLocaleString(), 'is-behind']];
	return statCard('timeline', 4, 'Timeline', m.status === 'active' ? 'Today' : m.status === 'upcoming' ? 'Soon' : 'Done',
		figure + bar + '<dl class="ps-cols">' + cols.map(function (c) {
			return '<div><dt class="' + c[2] + '">' + c[0] + '</dt><dd>' + c[1] + '</dd></div>';
		}).join('') + '</dl>',
		(m.status === 'finished' ? 'Ended ' : 'Ends ') + statDate(m.last, { weekday: 'long', month: 'short', day: 'numeric' }));
}

function statWeekCard(m) {
	// this week if the plan is running, otherwise its first week
	var anchor = m.status === 'active' ? m.today : m.status === 'upcoming' ? m.first : m.last,
		sunday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay()),
		week = [], max = 0, sum = 0, count = 0;

	for (var i = 0; i < 7; i++) {
		var d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i),
			r = m.readings.filter(function (x) { return +x.date === +d; })[0] || null;
		week.push({ date: d, reading: r });
		if (r) { max = Math.max(max, r.minutes); sum += r.minutes; count++; }
	}

	var cols = week.map(function (w) {
		var r = w.reading, isToday = +w.date === +m.today,
			cls = (isToday ? ' is-now' : '') + (r && r.done ? ' is-done' : '') + (!r ? ' is-rest' : '');
		return '<li class="' + cls.trim() + '"' + (r ? ' data-d="' + escapeAttr(statDate(w.date, { weekday: 'short', month: 'short', day: 'numeric' })) + '" data-r="' + escapeAttr(r.day.formattedReading) + '" data-v="' + r.day.versesForToday + '" data-m="' + statMin(r.minutes) + '"' : '') + '>' +
			'<span class="ps-pill"><span style="height:' + (r ? Math.max(12, r.minutes / max * 100).toFixed(1) : 0) + '%"></span></span>' +
			'<b>' + statDate(w.date, { weekday: 'narrow' }) + '</b></li>';
	}).join('');

	var t = m.status === 'active' ? m.todayReading : null;
	return statCard('week', 1, 'This week', '7 days',
		(t ? statFigure(statMin(t.minutes), 'min today') : statFigure(count, count === 1 ? 'reading' : 'readings')) +
		'<ol class="ps-week">' + cols + '</ol>',
		statMin(sum) + ' min across ' + count + (count === 1 ? ' reading' : ' readings'));
}

function statProgressCard(m) {
	var total = m.readings.length, done = m.done.length, pct = total ? Math.round(done / total * 100) : 0,
		r = 52, c = 2 * Math.PI * r, arc = c * 0.75;
	var gauge = '<div class="ps-gauge" role="img" aria-label="' + pct + '% complete">' +
		'<svg viewBox="0 0 120 120" aria-hidden="true">' +
			'<circle cx="60" cy="60" r="' + r + '" class="ps-gauge-track" stroke-dasharray="' + arc.toFixed(1) + ' ' + c.toFixed(1) + '" />' +
			(done ? '<circle cx="60" cy="60" r="' + r + '" class="ps-gauge-fill" stroke-dasharray="' + (arc * done / total).toFixed(1) + ' ' + c.toFixed(1) + '" />' : '') +
		'</svg>' +
		'<p><b><span data-n="' + pct + '">' + pct + '</span><small>%</small></b><span>Complete</span></p></div>';
	return statCard('progress', 3, 'Progress', 'Checked off', gauge,
		done.toLocaleString() + ' of ' + total.toLocaleString() + ' readings read');
}

function statBooksCard(m) {
	var list = Object.keys(m.books).sort(function (a, b) { return m.books[b] - m.books[a]; }).slice(0, 4);
	var rows = list.map(function (usfm) {
		var info = bible.BIBLE_DATA[usfm];
		return '<li><span>' + escapeHtml(info ? bible.getName(info, m.lang || 'en') : usfm) + '</span><b>' + m.books[usfm] + ' ch</b></li>';
	}).join('');
	var n = Object.keys(m.books).length;
	return statCard('books', 7, 'Books', 'Most chapters',
		statFigure(n, n === 1 ? 'book' : 'books') + '<ul class="ps-rows">' + rows + '</ul>',
		Object.keys(m.chapters).length.toLocaleString() + ' chapters in all');
}

function statSectionsCard(m) {
	var totals = STAT_SECTIONS.map(function () { return { verses: 0, chapters: 0 }; }), all = 0;

	Object.keys(m.chapters).forEach(function (key) {
		var c = m.chapters[key], book = bible.BIBLE_DATA[c.usfm];
		if (!book) return;
		var slot = -1;
		STAT_SECTIONS.forEach(function (s, n) { if (s.sections.indexOf(book.section) > -1) slot = n; });
		if (slot < 0) return;
		var verses = (book.chapters && book.chapters[c.chapter - 1]) || 0;
		totals[slot].verses += verses;
		totals[slot].chapters += 1;
		all += verses;
	});

	var parts = STAT_SECTIONS.map(function (s, n) {
		return { name: s.name, slot: n + 1, verses: totals[n].verses, chapters: totals[n].chapters, share: all ? totals[n].verses / all : 0 };
	}).filter(function (p) { return p.verses > 0; });

	if (!parts.length) return '';

	function pct(p) { var v = p.share * 100; return (v < 1 ? '<1' : Math.round(v)) + '%'; }

	var blocks = parts.map(function (p) {
		var label = p.name + ': ' + pct(p) + ', ' + p.chapters.toLocaleString() + ' chapters, ' + p.verses.toLocaleString() + ' verses';
		return '<span class="ps-seg ps-s' + p.slot + '" style="flex-grow:' + p.verses + '" tabindex="0" aria-label="' + escapeAttr(label) + '"' +
			' data-d="' + escapeAttr(p.name) + '" data-r="' + p.chapters.toLocaleString() + ' chapters" data-v="' + p.verses + '" data-p="' + escapeAttr(pct(p)) + '">' +
			(p.share >= 0.1 ? pct(p) : '') + '</span>';
	}).join('');

	var rows = parts.map(function (p) {
		return '<li><span><i class="ps-s' + p.slot + '"></i>' + p.name + '</span><b>' + pct(p) + ' · ' + p.chapters.toLocaleString() + ' ch</b></li>';
	}).join('');

	var top = parts.slice().sort(function (a, b) { return b.share - a.share; })[0];
	return statCard('sections', 5, 'What you’ll read', 'By verses',
		'<div class="ps-segbar">' + blocks + '</div><ul class="ps-rows ps-rows-2">' + rows + '</ul>',
		parts.length > 1 ? 'Mostly ' + top.name : 'All ' + top.name);
}

function statLongestCard(m) {
	var rows = m.byLength.slice(0, 5).map(function (r) {
		return '<li><span><em>' + statDate(r.date) + '</em>' + escapeHtml(r.day.formattedReading) + '</span><b>' + statMin(r.minutes) + ' min</b></li>';
	}).join('');
	return statCard('longest', 8, 'Longest days', 'Top 5', '<ul class="ps-rows">' + rows + '</ul>',
		'Shortest ' + statDate(m.shortest.date) + ' · ' + statMin(m.shortest.minutes) + ' min');
}

function statsView(m) {
	return '<div class="ps-view" role="dialog" aria-modal="true" aria-label="Plan stats">' +
		'<div class="ps-view-inner">' +
			'<div class="ps-view-bar"><button type="button" class="btn btn-ghost ps-back" data-stats-close>' +
				'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button></div>' +
			statHero(m) +
			'<div class="ps-cards">' +
				statTimeCard(m) + statTimelineCard(m) +
				statWeekCard(m) + statProgressCard(m) + statBooksCard(m) +
				statSectionsCard(m) + statLongestCard(m) +
			'</div>' +
		'</div></div>';
}

/* Opening grows the hero card out of the tiles row, after the widget pages on bybrisk.com: a plain copy
   of the card's surface stretches from the tiles to the hero's place, hands over, and everything rises in.
   Back runs it the other way. */
(function () {
	var view = null, source = null, root = document.documentElement;
	function motion() { return window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

	function ghostAt(rect, bg) {
		var ghost = document.createElement('div');
		ghost.className = 'ps-ghost';
		Object.assign(ghost.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', backgroundColor: bg });
		document.body.appendChild(ghost);
		return ghost;
	}

	function countUp(scope, delay) {
		scope.querySelectorAll('[data-n]').forEach(function (el) {
			var target = Number(el.getAttribute('data-n')), o = { n: 0 };
			el.textContent = '0';
			window.gsap.to(o, { n: target, duration: 1.3, delay: delay, ease: 'expo.out', onUpdate: function () { el.textContent = Math.round(o.n).toLocaleString(); } });
		});
	}

	function open(tiles) {
		if (view || !lastPlanStats) return;
		var m = planStatsModel(lastPlanStats.days, lastPlanStats.lang);
		if (!m) return;
		source = tiles;
		var wrap = document.createElement('div');
		wrap.innerHTML = statsView(m);
		view = wrap.firstChild;
		document.body.appendChild(view);
		root.classList.add('ps-locked');
		view.querySelector('.ps-back').focus({ preventScroll: true });
		if (!motion()) return;

		var g = window.gsap, hero = view.querySelector('.ps-hero'), to = hero.getBoundingClientRect(),
			ghost = ghostAt(tiles.getBoundingClientRect(), getComputedStyle(tiles).backgroundColor);
		g.set(hero, { opacity: 0 });
		g.timeline()
			.from(view, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0)
			.from(view.querySelectorAll('.ps-view-bar > *'), { y: -10, opacity: 0, duration: 0.8, ease: 'expo.out', clearProps: 'transform,opacity' }, 0)
			.to(ghost, { left: to.left, top: to.top, width: to.width, height: to.height, backgroundColor: getComputedStyle(hero).backgroundColor, duration: 0.7, ease: 'expo.inOut' }, 0)
			.set(hero, { opacity: 1 })
			.to(ghost, { opacity: 0, duration: 0.25, ease: 'power1.out', onComplete: function () { ghost.remove(); } })
			.from(hero.children, { opacity: 0, y: 10, duration: 0.7, stagger: 0.06, ease: 'expo.out', clearProps: 'transform,opacity' }, '<')
			.from(view.querySelectorAll('.ps-card'), { y: 28, opacity: 0, duration: 1.1, stagger: 0.05, ease: 'expo.out', clearProps: 'transform,opacity' }, 0.55);
		countUp(view, 0.6);
	}

	function close() {
		if (!view) return;
		var v = view, tiles = source && document.body.contains(source) ? source : document.querySelector('.plan-stats');
		view = null;
		function done() {
			v.remove();
			root.classList.remove('ps-locked');
			if (tiles) tiles.focus({ preventScroll: true });
			source = null;
		}
		if (!motion()) return done();
		var g = window.gsap, hero = v.querySelector('.ps-hero'), r = tiles && tiles.getBoundingClientRect();
		if (!r || r.bottom < 0 || r.top > window.innerHeight) {
			return g.to(v, { opacity: 0, duration: 0.25, onComplete: done });
		}
		var ghost = ghostAt(hero.getBoundingClientRect(), getComputedStyle(hero).backgroundColor);
		g.timeline({ onComplete: function () { ghost.remove(); done(); } })
			.to(v.querySelectorAll('.ps-card, .ps-view-bar > *'), { opacity: 0, y: 16, duration: 0.25, stagger: 0.015, ease: 'power2.in' }, 0)
			.to(hero, { opacity: 0, duration: 0.15 }, 0)
			.to(ghost, { left: r.left, top: r.top, width: r.width, height: r.height, backgroundColor: getComputedStyle(tiles).backgroundColor, duration: 0.6, ease: 'expo.inOut' }, 0.1)
			.to(v, { opacity: 0, duration: 0.3 }, 0.35)
			.to(ghost, { opacity: 0, duration: 0.15 }, 0.6);
	}

	document.addEventListener('click', function (e) {
		var t = e.target.closest && e.target.closest('[data-stats-open], [data-stats-close]');
		if (!t) return;
		if (t.hasAttribute('data-stats-open')) open(t);
		else close();
	});
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && view) { close(); return; }
		if ((e.key === 'Enter' || e.key === ' ') && e.target.hasAttribute && e.target.hasAttribute('data-stats-open')) {
			e.preventDefault();
			open(e.target);
		}
	});
})();

/* One hover/tap tooltip per card; cards are rebuilt on every open, so listen on the document */
(function () {
	var current = null;
	function tipFor(mark) { var card = mark.closest('.ps-card'); return card && card.querySelector('.ps-tip'); }

	function show(mark) {
		var tip = tipFor(mark);
		if (!tip) return;
		if (current && current !== mark) clear();
		current = mark;
		mark.classList.add('is-hover');
		var d = mark.dataset, lines;
		if (mark.classList.contains('is-rest')) lines = '<strong>' + escapeHtml(d.d || '') + '</strong><span>Rest day</span>';
		else if (d.p) lines = '<strong>' + escapeHtml(d.d) + ' · ' + escapeHtml(d.p) + '</strong><span>' + escapeHtml(d.r) + ' · ' + Number(d.v).toLocaleString() + ' verses</span>';
		else lines = '<strong>' + escapeHtml(d.d) + '</strong><span>' + escapeHtml(d.r) + '</span><span>' + Number(d.v).toLocaleString() + ' verses · ' + d.m + ' min</span>';
		tip.innerHTML = lines;
		tip.hidden = false;
		var card = mark.closest('.ps-card').getBoundingClientRect(), box = mark.getBoundingClientRect(),
			x = box.left + box.width / 2 - card.left, w = tip.offsetWidth;
		tip.style.left = Math.min(Math.max(8, x - w / 2), card.width - w - 8) + 'px';
		tip.style.top = (box.top - card.top - tip.offsetHeight - 8) + 'px';
	}

	function clear() {
		if (!current) return;
		current.classList.remove('is-hover');
		var tip = tipFor(current);
		if (tip) tip.hidden = true;
		current = null;
	}

	var MARKS = '.ps-bars i, .ps-seg, .ps-week li[data-d], .ps-week li.is-rest';
	document.addEventListener('pointerover', function (e) {
		var mark = e.target.closest && e.target.closest(MARKS);
		if (mark && mark.dataset.d) show(mark);
		else if (current && !(e.target.closest && e.target.closest('.ps-bars, .ps-segbar, .ps-week'))) clear();
	});
	document.addEventListener('focusin', function (e) {
		if (e.target.classList && e.target.classList.contains('ps-seg')) show(e.target);
	});
	document.addEventListener('focusout', function (e) {
		if (e.target.classList && e.target.classList.contains('ps-seg')) clear();
	});
})();

function buildbooks(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates) {

	// One row per book, in Bible order, with that book's readings in date order. Plans that jump
	// between books (chronological, M'Cheyne, harmonies) still read as a clean list of books.
	var today = new Date(),
		boxesByBook = {},
		bookOrder = Object.keys(bible.BIBLE_DATA);

	for (var i=0; i<data.days.length; i++) {
		var dayInfo = data.days[i];

		for (var j=0; j<dayInfo.chapters.length; j++) {
			var chapter = dayInfo.chapters[j],
				bookInfo = bible.BIBLE_DATA[chapter.usfm],
				first = chapter,
				last = chapter,
				chaptersOnThisDay = 1;

			if (!bookInfo) {
				continue;
			}

			// how many chapters of this book are in this day's reading?
			while (j + 1 < dayInfo.chapters.length && dayInfo.chapters[j + 1].usfm == chapter.usfm) {
				j++;
				last = dayInfo.chapters[j];
				chaptersOnThisDay++;
			}

			(boxesByBook[chapter.usfm] = boxesByBook[chapter.usfm] || []).push(
				'<span class="box chapter ' + (isSameDay(today, dayInfo.date) ? ' is-today': '') + ' section-' + bible.SECTIONS[bookInfo.section] + ' chapters-' + chaptersOnThisDay + '">' +
					(noDates ? '' : (dayInfo.date.getMonth()+1) + '/' + (dayInfo.date.getDate()) + ': ' ) +
					formatBookBoxRange(bookInfo, first, last) +
				'</span>');
		}
	}

	var html = ['<div class="plan-books">'];

	bookOrder.forEach(function(usfm) {
		if (!boxesByBook[usfm]) {
			return;
		}
		var bookInfo = bible.BIBLE_DATA[usfm];
		html.push('<div class="book">');
		html.push('<div class="name"><span class="box title section-' + bible.SECTIONS[bookInfo.section] + '">' + bible.getName(bookInfo, lang) + '</span></div>');
		html.push('<div class="chapters">' + boxesByBook[usfm].join('') + '</div>');
		html.push('</div>');
	});

	html.push('</div>');

	return html.join('\n');
}

// "3", "3–5", or with verses when a pericope plan reads part of a chapter: "1:39–66", "1:67–2:12"
function formatBookBoxRange(bookInfo, first, last) {
	var startVerse = first.startVerse || 1,
		endVerse = last.endVerse || bookInfo.chapters[last.chapter - 1],
		wholeChapters = startVerse === 1 && endVerse === bookInfo.chapters[last.chapter - 1];

	if (wholeChapters) {
		return first.chapter + (first.chapter != last.chapter ? '–' + last.chapter : '');
	}
	if (first.chapter == last.chapter) {
		return first.chapter + ':' + startVerse + '–' + endVerse;
	}
	return first.chapter + ':' + startVerse + '–' + last.chapter + ':' + endVerse;
}

function buildcircle(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates) {

	// simplify the format for the circle
	// get the CSS class for the slivers

	var dateEntries = [];
	for (var i=0; i<data.days.length; i++) {
		var entry = data.days[i];
		var bookInfo = entry.chapters.length > 0 ? bible.BIBLE_DATA[entry.chapters[0].usfm] : null;		
		var cssClass = 'section-' + (bookInfo != null ? bible.SECTIONS[bookInfo.section] : '');

		dateEntries.push({
			date: entry.date,
			text: entry.formattedReading,
			sliceColor: '#fff',
			sliceCssClass: cssClass,
		});
	}

	var svgNode = renderSvgCircle(dateEntries, lang, noDates);
	
	var outer = document.createElement('div');
	outer.appendChild(svgNode);

	var colorList = document.createElement('div');
	colorList.innerHTML =  generateColorListHtml();
	outer.appendChild(colorList);

	var topright = svgNode.cloneNode(true);
	topright.setAttribute("viewBox", "0 0 500 500");
	topright.setAttribute("style", "margin: 20px 0");
	outer.appendChild(topright);

	var bottomright = svgNode.cloneNode(true);
	bottomright.setAttribute("viewBox", "-500 0 500 500");
	bottomright.setAttribute("style", "margin: 20px 0");
	outer.appendChild(bottomright);	

	var bottomleft = svgNode.cloneNode(true);
	bottomleft.setAttribute("viewBox", "-500 -500 500 500");
	bottomleft.setAttribute("style", "margin: 20px 0");
	outer.appendChild(bottomleft);	
	
	var topleft = svgNode.cloneNode(true);
	topleft.setAttribute("viewBox", "0 -500 500 500");
	topleft.setAttribute("style", "margin: 20px 0");
	outer.appendChild(topleft);	
	

	return outer.outerHTML;

	//return svgNode.outerHTML;
}

function renderSvgCircle(dateEntries, lang, noDates) {

	/* internal functions */

	function getCoordinatesForPercent(percent) {
		const x = Math.cos(2 * Math.PI * percent);
		const y = Math.sin(2 * Math.PI * percent);

		return [x, y];
	}



	const settings = {
		mainSize: 1000,		
		radius: 490,
		mainCircleFill: '#fcfcfc',
		mainCircleStroke: '#111111',
		monthLineLength: 180,
		monthLineStroke: '#999',
		weekLineLength: 150,
		weekLineStroke: '#bbb',
		dayLineLength: 150,
		dayLineStroke: '#ddd',

		monthFontFamily: 'Helvetica, Arial',
		monthFontColor: '#333',
		monthFontSize: '10px',

		entryFontColor: '#333',
		entryFontFamily: 'Helvetica, Arial',
		entryFontSize: '6px',

		dateFontColor: '#999',
		dateFontFamily: 'Consolas, Courier New, monospace',		

		titleText: 'Bible Reading Plan',
		titleFontFamily: 'Helvetica, Arial',
		titleFontSize: '24px',
		titleFontFill: '#111',  		
	};

	const segments = dateEntries.length;

	if (segments <= 180) {
		settings.entryFontSize = '8px';
	}
	if (segments <= 60) {
		settings.entryFontSize = '10px';
	}

	
	// main nodes
	//const targetDiv = document.getElementById('svg-area');
	const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svgNode.setAttributeNS(null, 'height', 890); //settings.mainSize);
	svgNode.setAttributeNS(null, 'width', 890); //settings.mainSize);
	svgNode.setAttributeNS(null, 'viewBox', '-' + (settings.mainSize/2) + ' -' + (settings.mainSize/2) + ' ' + (settings.mainSize) + ' ' + (settings.mainSize));
	svgNode.setAttributeNS(null, 'transform', 'rotate(-90)');
	//targetDiv.appendChild(svgNode);
	//document.body.appendChild(svgNode);

	const circleNode = createSvgNode('circle', {
			'r': settings.radius, 
			'fill': settings.mainCircleFill, 
			'stroke': settings.mainCircleStroke, 
			'stroke-width': 0.5});
	svgNode.appendChild(circleNode);
	

	for (var i=0; i<segments; i++) {
	
		const dateEntry = dateEntries[i];		
		const planDate = dateEntry.date;
	
		const secondHalf = i>segments/2;
		const segmentAddition = 0.5; // move half way
		const lineLocation = getCoordinatesForPercent(i/segments);
		const sliceEndLocation = getCoordinatesForPercent((i+1)/segments);
		const textLocation = getCoordinatesForPercent((i+segmentAddition)/segments);   
	
		// SLICE
	
		const sliceNode = createSvgNode('path', {			
			'fill': dateEntry.sliceColor, 
			'class': dateEntry.sliceCssClass,
			'style': 'opacity: 0.3',
			'd': [
				`M ${lineLocation[0]*settings.radius} ${lineLocation[1]*settings.radius}`, // Move
				`A ${settings.radius} ${settings.radius} 0 0 1 ${sliceEndLocation[0]*settings.radius} ${sliceEndLocation[1]*settings.radius}`, // Arc
				`L 0 0`, // Line
			  ].join(' ')
		});
		svgNode.appendChild(sliceNode);
	   
	
		// LINEs
		const lineLength = planDate.getDate() == 1 ? settings.monthLineLength : settings.dayLineLength;
		const lineColor = planDate.getDate() == 1 ? settings.monthLineStroke : planDate.getDay() == 0 ? settings.weekLineStroke : settings.dayLineStroke;
		const lineNode = createSvgNode('line', {
							'x1': (settings.radius) * lineLocation[0] /* + center */, 
							'y1': (settings.radius) * lineLocation[1] /* + center */, 
							'x2': (settings.radius-lineLength) * lineLocation[0] /* + center */,
							'y2': (settings.radius-lineLength) * lineLocation[1] /* + center */,
							'stroke': lineColor});
		svgNode.appendChild(lineNode);     
	
		// MONTH NAMEs
		if (!noDates && planDate.getDate() == 1 ) {

			const curveEndLocation = getCoordinatesForPercent((i+30)/segments);

			const monthRadius = 250;			
			const id = 'mpath-' + planDate.getMonth();
	
			const monthPath = createSvgNode('path', {
				'id': id, 
				'fill': 'transparent', 
				'stroke': 'transparent', 				
				'd': `M ${monthRadius * lineLocation[0]} ${monthRadius * lineLocation[1]} A ${monthRadius} ${monthRadius} 0 0 1 ${monthRadius * curveEndLocation[0]} ${monthRadius * curveEndLocation[1]}`
			});
			svgNode.appendChild(monthPath);
	
			const monthTextNode = createSvgNode('text', {
				'font-family': settings.monthFontFamily,
				'font-size': settings.monthFontSize,
				'fill': settings.monthFontColor,      
			});
			svgNode.appendChild(monthTextNode);
			monthTextNode.appendChild(
					createTextPath( planDate.toLocaleDateString(lang, {month:"long"}).toUpperCase(), {
						'href': '#' + id, 
						'startOffset':'50%', 
						'text-anchor':'middle'
					})
			);
		}

		const 
			textInset = 3,			
			textX = (settings.radius-textInset) * textLocation[0],
			textY = (settings.radius-textInset) * textLocation[1],
			textR = ((i+segmentAddition)/segments * 360 + (secondHalf ? -180 : 0));  		
	
		// CREATE Text
		const textNode = createSvgNode('text', {
			'x': textX, 
			'y': textY,  			
			'transform': 'rotate(' + textR + ' ' + textX + ' ' +  textY + ')',			
			'font-family': settings.entryFontFamily,
			'font-size': settings.entryFontSize,
			'fill': settings.entryFontColor,   
			'dominant-baseline': 'middle',
			'text-anchor': secondHalf ? 'start' : 'end',     
		});
	 
		if (!secondHalf) {
			textNode.appendChild(createTSpan(dateEntry.text + ' ', {"padding-right": '10px'}));
		}

		
		const mm = dateEntry.date.getMonth() + 1;
		const dd = dateEntry.date.getDate();
		let formattedDate = [
				(mm>9 ? '' : '0') + mm,
				(dd>9 ? '' : '0') + dd
			   ].join('/');
			
		if (noDates) {
			formattedDate = (i+1).toString().padStart(segments.toString().length, '0');
		}
	
		textNode.appendChild( 
					createTSpan(' ' + formattedDate + ' ', {
						'fill': settings.dateFontColor, 
						'font-family': settings.dateFontFamily,
					}) 
				);
		
		if (secondHalf) {
			textNode.appendChild(createTSpan(' ' + dateEntry.text));
		}
	
		svgNode.appendChild(textNode);
	
		// adjust position
 
	}
	
	// INNER CIRCLE
	const innerCircle = createSvgNode('circle', {r: 240, /* cx: center, cy: center, */ fill: '#fff', stroke: '#ccc'});
	svgNode.appendChild(innerCircle);
	
	const innerCircle2 = createSvgNode('circle', {r: 200, /* cx: center, cy: center, */ fill: '#fff', stroke: '#ccc'});
	svgNode.appendChild(innerCircle2);
	
	// TITLE
	const titleNode = createSvgNode('text', {
		'font-family': settings.titleFontFamily, 
		'font-size': settings.titleFontSize, 
		'fill': settings.titleFontFill,		 		
		'transform': 'rotate(90)',
		'dominant-baseline': 'middle',
		'text-anchor': 'middle',    
	});
	svgNode.appendChild(titleNode);
	titleNode.appendChild(createTSpan(settings.titleText));
	
	//document.body.removeChild(svgNode);

	return svgNode;

}


function buildcirclecal(lang, data, startDate, duration, bookList, dayList, showStats, showDailyStats, noDates) {

	/*
	var dateEntries = [];
	for (var i=0; i<data.days.length; i++) {
		var entry = data.days[i];
		var bookInfo = entry.chapters.length > 0 ? bible.BIBLE_DATA[entry.chapters[0].usfm] : null;		
		var cssClass = 'section-' + (bookInfo != null ? bible.SECTIONS[bookInfo.section] : '');

		dateEntries.push({
			date: entry.date,
			text: entry.formattedReading,
			sliceColor: '#fff',
			sliceCssClass: cssClass,
		})
	}
	*/

    // base measurements: 300,300
    let start = 300;
    let depth = 25;

    // how many days is this?
    let totalDays = data.days.length;
   
    let weeks = Math.ceil(totalDays/7);

    // make 7 layers (empty for mow)
    let layers = [];
    for (let inner=1; inner<=7; inner++) {
        layers.push({
            segments: Array( weeks ), 
			//segments: weeks,
            dayLabels: Array.from({length:weeks}, (_,i)=> ''), 
            textLabels: Array.from({length:weeks}, (_,i)=> ''), 
			cssClasses: Array.from({length:weeks}, (_,i)=> ''), 
            outerR: start - ((inner-1) * depth),
            innerR: start - (inner * depth),      
            gapDeg: 0,
            colors: Array.from({length:weeks}, (_,i)=>'#eeeeee')
        })
    }

    // add days to first week to ensure sunday start
	while (data.days[0].date.getDay() > 0) {

		let emptyDay = {
			date: data.days[0].date.addDays(-1),
			formattedReading: '',
            empty: true
		};
			
		data.days.splice(0,0,emptyDay);
    }
    // add days to final week to ensure saturday end
	while (data.days[data.days.length-1].date.getDay() < 6) {

		let emptyDay = {
			date: data.days[data.days.length-1].date.addDays(1),
			formattedReading: '',
            empty: true
		};
			
		data.days.push(emptyDay);
    }

    let dayArray = [6,5,4,3,2,1,0];

    // fill in the layers with day info
    for (var dayIndex=0; dayIndex < data.days.length; dayIndex++) {

        var passage = data.days[dayIndex];
        var layerIndex = dayArray[ data.days[dayIndex].date.getDay() ];
        var weekIndex = Math.floor( (dayIndex) / 7 );

		var segment = {monthLabel: '', dayLabel: '', weeksInMonth: 0, firstIsSunday: 0, textLabel: '', color: '#ffffff', isFirstOfMonth: false, isFirstWeek: false};
		
		if (!passage.empty) {

			segment.color = passage.date.getMonth() % 2 == 0 ? '#eeeeee' : '#dddddd';			
			segment.textLabel = passage.formattedReading;
			segment.dayLabel = passage.date.getDate();

			segment.isFirstWeek = passage.date.getDate() <= 7; 

			if (passage.date.getDate() == 1) {
				segment.isFirstOfMonth = true;
				segment.firstIsSunday = passage.date.getDay() == 0 ? 1 : 0;
				segment.dayLabel = passage.date.toLocaleDateString(lang, {month:"short"}) + ' ' + passage.date.getDate();
				
				segment.monthLabel = passage.date.toLocaleDateString(lang, {month:"long"});

				// count the number of weeks
				let weekStartDay = 0; // sunday
				let weekCount = 0;
				let currentDate = passage.date;
				let endDate = new Date(passage.date.getFullYear(), passage.date.getMonth() + 1, 0);
				while(currentDate.getTime() <= endDate.getTime()){
					if(currentDate.getDay() === weekStartDay){
						weekCount++;
					}
					currentDate.setDate(currentDate.getDate() + 1);
				}
				segment.weeksInMonth = weekCount;				

			}



			
			
			var entry = data.days[dayIndex];
			var bookInfo = entry.chapters && entry.chapters.length > 0 ? bible.BIBLE_DATA[entry.chapters[0].usfm] : null;		
			
			segment.cssClass = 'section-' + (bookInfo != null ? bible.SECTIONS[bookInfo.section] : '');				;				
		}

		layers[layerIndex].segments[weekIndex] = segment;
    }

	var svgNode = renderSvgCircleCal(layers);

	var outer = document.createElement('div');

	outer.appendChild(svgNode);

	var colorList = document.createElement('div');
	colorList.innerHTML =  generateColorListHtml();
	outer.appendChild(colorList);

	var topright = svgNode.cloneNode(true);
	topright.setAttribute("viewBox", "300 0 300 300");
	topright.setAttribute("style", "margin: 20px 0");
	outer.appendChild(topright);

	var bottomright = svgNode.cloneNode(true);
	bottomright.setAttribute("viewBox", "300 300 300 300");
	bottomright.setAttribute("style", "margin: 20px 0");
	outer.appendChild(bottomright);	

	var bottomleft = svgNode.cloneNode(true);
	bottomleft.setAttribute("viewBox", "0 300 300 300");
	bottomleft.setAttribute("style", "margin: 20px 0");
	outer.appendChild(bottomleft);	
	
	var topleft = svgNode.cloneNode(true);
	topleft.setAttribute("viewBox", "0 0 300 300");
	topleft.setAttribute("style", "margin: 20px 0");
	outer.appendChild(topleft);		

	return outer.outerHTML;
	//return svgNode.outerHTML;
}

function renderSvgCircleCal(layers) {

	/* utility functions */
	function degToRad(d) {
		return d * Math.PI / 180;
	}
	
	function polar(cx, cy, r, a) {
		const rad = degToRad(a - 90);
		return { 
				x: cx + r * Math.cos(rad), 
				y: cy + r * Math.sin(rad) 
		};
	}

	function largeArc(a) {
		return a > 180 ? 1 : 0;
	}

	function makeWedgePath(cx, cy, r0, r1, a0, a1) {
		const p0 = polar(cx, cy, r1, a0);
		const p1 = polar(cx, cy, r1, a1);
		const q0 = polar(cx, cy, r0, a0);
		const q1 = polar(cx, cy, r0, a1);

		return `
			M ${p0.x} ${p0.y}
			A ${r1} ${r1} 0 ${largeArc(a1 - a0)} 1 ${p1.x} ${p1.y}
			L ${q1.x} ${q1.y}
			A ${r0} ${r0} 0 ${largeArc(a1 - a0)} 0 ${q0.x} ${q0.y}
			Z
		`;
	}

	function makeCornerOutline(cx, cy, r0, r1, a0, a1) {
		const p0 = polar(cx, cy, r1, a0);
		const p1 = polar(cx, cy, r1, a1);
		const q0 = polar(cx, cy, r0, a0);
		const q1 = polar(cx, cy, r0, a1);

		return `
			M ${q1.x} ${q1.y}
			A ${r0} ${r0} 0 ${largeArc(a1 - a0)} 0 ${q0.x} ${q0.y}
			L ${p0.x} ${p0.y}			
		`;
	}	

	function makeTopOutline(cx, cy, r0, r1, a0, a1) {
		const p0 = polar(cx, cy, r1, a0);
		const p1 = polar(cx, cy, r1, a1);
		const q0 = polar(cx, cy, r0, a0);
		const q1 = polar(cx, cy, r0, a1);

		return `
			M ${q0.x} ${q0.y}
			L ${p0.x} ${p0.y}
		`;
	}		

	/* ---------- Arc path for text ---------- */
	/* This creates an arc along the *middle* radius of the wedge */
	function makeArcPath(cx, cy, radius, a0, a1) {
		const p0 = polar(cx, cy, radius, a0);
		const p1 = polar(cx, cy, radius, a1);
		return `
			M ${p0.x} ${p0.y}
			A ${radius} ${radius} 0 ${largeArc(a1 - a0)} 1 ${p1.x} ${p1.y}
		`;
	}


	/// START
	let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 600 600");
	svg.setAttribute("width",890);
	svg.setAttribute("height",890);
	//svg.setAttribute("style","margin: 0");
	svg.innerHTML = ""; // clear SVG
	
	const cx = 300;
 	const cy = 300;


	// INNER CIRCLE
	const innerCircle = createSvgNode('circle', {r: layers[layers.length-1].innerR, cx: cx, cy: cy, fill: '#fff', stroke: '#ccc'});
	svg.appendChild(innerCircle);
	
	const innerCircle2 = createSvgNode('circle', {r: layers[layers.length-1].innerR-20, cx: cx, cy: cy,  fill: '#fff', stroke: '#ccc'});
	svg.appendChild(innerCircle2);

	const outlineCircle = createSvgNode('circle', {r: layers[0].outerR, cx: cx, cy: cy,  fill: 'transparent', stroke: '#ccc'});
	svg.appendChild(outlineCircle);
	
	// layers

	layers.forEach((layer, layerIndex) => {
		
		const {
			segments,
			//dayLabels = [],
			//textLabels = [],
			//cssClasses = [],
			innerR,
			outerR,
			gapDeg = 0,
			//colors = null
		} = layer;
		
		//const segments = layer.ls

		const full = 360;
		const rawAngle = full / segments.length;
		const segAngle = rawAngle - gapDeg;
		const textRadius = (innerR + outerR) / 2;  // place text at mid-radius

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			const start = i * rawAngle + gapDeg / 2;
			const end = start + segAngle;
			const color = segment.color;
			/*
			const color = typeof colors === "function"
				? colors(i)
				: Array.isArray(colors)
					? colors[i % colors.length]
					: `hsl(${(i/segments.length)*360} 60% 65%)`;
			*/

			/* ----- Wedge shape ----- */
			const wedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
			wedge.setAttribute("d", makeWedgePath(cx, cy, innerR, outerR, start, end));
			wedge.setAttribute("fill", color);
			wedge.setAttribute("style","stroke: #fff; stroke-width:0.5; opacity: 0.5;"); // should be CSS?
			//wedge.classList.add("wedge");
			wedge.classList.add(segment.cssClass);

			// for interactive work
			wedge.dataset.layer = layerIndex;
			wedge.dataset.index = i;
			svg.appendChild(wedge); 


			// create left and top
			if (segment.isFirstOfMonth && !segment.firstIsSunday) {
				const wedgeOutline = document.createElementNS("http://www.w3.org/2000/svg", "path");
				wedgeOutline.setAttribute("d", makeCornerOutline(cx, cy, innerR, outerR, start, end));
				wedgeOutline.setAttribute("fill", 'transparent');
				wedgeOutline.setAttribute("style","stroke: #333; stroke-width:0.5;"); // should be CSS?
				svg.appendChild(wedgeOutline); 
			}
			// just top
			if (segment.isFirstWeek) {
				const wedgeOutline = document.createElementNS("http://www.w3.org/2000/svg", "path");
				wedgeOutline.setAttribute("d", makeTopOutline(cx, cy, innerR, outerR, start, end));
				wedgeOutline.setAttribute("fill", 'transparent');
				wedgeOutline.setAttribute("style","stroke: #333; stroke-width:0.5;"); // should be CSS?
				svg.appendChild(wedgeOutline); 
			}			


			// calculate position of text (foreignObject)
			const mid = start + segAngle / 2;
			const rMid = (innerR + outerR) / 2;
			const { x, y } = polar(cx, cy, rMid, start+1.5) // mid);
			
			// foreignObject (so text can flow)
			const fomid = start+2.1;
			const fopos = polar(cx, cy, innerR+2.5, fomid);        
			const outerSvg = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
			outerSvg.setAttribute("transform", `translate(${fopos.x},${fopos.y}) rotate(${mid-90})`);
			outerSvg.setAttribute("width", `20`); 
			outerSvg.setAttribute("height", `14`);  // allows three lines in outer rungs
			
			const wedgeContent = document.createElement("p");
			wedgeContent.textContent = segment.textLabel;
			wedgeContent.setAttribute("style", `margin: 0; padding: 0; line-height: 1.1; 
										font-size: 4.5px; fill: #1a1a1a; 
										text-anchor: middle; dominant-baseline: middle;`); 

			if (segment.textLabel.length > 20 && layerIndex > 2) {
				wedgeContent.style.fontSize = '4.0px';
				wedgeContent.style.lineHeight = '1.0';
			}
			if (segment.textLabel.length > 20 && layerIndex > 4) {
				wedgeContent.style.fontSize = '3.5px';
				wedgeContent.style.lineHeight = '1.0';
			}			
		
			outerSvg.appendChild(wedgeContent);
			svg.appendChild(outerSvg);

			// ------ top left number -----
			const nmid = start+0.3;
			const nrMid = (innerR + outerR) / 2;
			const numpos = polar(cx, cy, innerR+2.5 , nmid+0.5+ (layerIndex*0.2)); // for some reason, the angle needs to be lessened teh further out it goes
			const numberLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
			numberLabel.setAttribute("transform", `translate(${numpos.x},${numpos.y}) rotate(${start-90})`);
			numberLabel.setAttribute("style", `padding-left: 1px; font-size: 4px; fill: #666;`); 
			numberLabel.textContent = segment.dayLabel;       
			svg.appendChild(numberLabel);


			if (segment.isFirstOfMonth && segment.monthLabel != '') {
				/*
				const monthmid = start + (360/layer.segments.length*segment.weeksInMonth/2); // start at this wedge, then add 4 weeks
				const monthrMid = layers[layers.length-1].innerR-10; // just inside the last layer
				const monthpos = polar(cx, cy, monthrMid, monthmid); 
				const monthLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
				monthLabel.setAttribute("transform", `translate(${monthpos.x},${monthpos.y}) rotate(${monthmid})`);
				monthLabel.setAttribute("style", `text-anchor: middle; dominant-baseline: middle;
												 font-size: 5px; fill: #666;`); 
				monthLabel.textContent = segment.monthLabel;				
				svg.appendChild(monthLabel);
				*/


				const weekWidth = 360/layer.segments.length;
				const arcId = `arc-${layerIndex}-${i}`;
				const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
				arc.setAttribute("id", arcId);
				arc.setAttribute("d", makeArcPath(cx, cy, layers[layers.length-1].innerR-12, 
						start + (!segment.firstIsSunday * weekWidth), 
						start + (weekWidth*(segment.weeksInMonth+1) - (segment.firstIsSunday * weekWidth))
					));
				arc.setAttribute("fill", "none");
				arc.setAttribute("stroke", "none"); // segment.color); //"#f00");
				svg.appendChild(arc);

				// ----- Text following arc -----
				const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
				text.setAttribute("style", `text-transform: uppercase;
									font-size: 5px; fill: #666;`); 

				const textPath = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
				textPath.setAttributeNS("http://www.w3.org/1999/xlink", "href", `#${arcId}`);
				textPath.setAttribute("startOffset", "50%");
				textPath.setAttribute("text-anchor", "middle");
		
				textPath.textContent = segment.monthLabel;
				

				text.appendChild(textPath);
				svg.appendChild(text);				


			}

			
		
		} // segments
	}); // layers



	
	// TITLE
	const titleNode = createSvgNode('text', {
		//'font-family': settings.titleFontFamily, 
		//'font-size': settings.titleFontSize, 
		//'fill': settings.titleFontFill,		 		
		//'transform': 'rotate(90)',
		'dominant-baseline': 'middle',
		'text-anchor': 'middle',  
		x: cx, y: cy, 
	});
	svg.appendChild(titleNode);
	titleNode.appendChild(createTSpan('Bible Reading Plan'));


	return svg;
}

function createSvgNode(typeName, attributes = {}) {
	const svgNode = document.createElementNS('http://www.w3.org/2000/svg', typeName);

	setSvgAtts(svgNode, attributes);

	return svgNode;
}

function setSvgAtts(node, attributes = {}) {
	for (const [key, value] of Object.entries(attributes)) {
		node.setAttributeNS(null, key, value);
	}
}

function createTSpan(text, attributes = {}) {
	const tSpan = createSvgNode('tspan', attributes);
	var spanText = document.createTextNode( text );
	tSpan.appendChild(spanText);
	return tSpan;
}

function createTextPath(text, attributes = {}) {
	const tSpan = createSvgNode('textPath', attributes);
	var spanText = document.createTextNode( text );
	tSpan.appendChild(spanText);
	return tSpan;
}
