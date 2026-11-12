// EVENTS
$('#section-time input, ' + 
	'#section-days input, ' + 
	'#section-books input, #section-books select, ' + 
	'#section-options input, #section-options select, #options-language, ' + 
	'#section-format input').on('change keyup', updateDisplay);

$('#section-format input').on('change click', function() {
	// if circle
	var format = $('input:radio[name="formatstyle"]:checked').val();
	if (['circle','books'].indexOf(format) > -1) {
		// turn on color
		$('#options-sectioncolors').prop('checked', true);
	}
});	

// lang
$('#options-language').on('change click', updateBookLists);

// traditional ot/nt clicking
$('.order-traditional, .order-alternate').on('click', 'input', adjustBooks);
$('.order-mcheyne').on('click', 'input', mcheyneDivisionCheck);
$('[name=bibleorder]').on('click', enableTestaments);

// yallversion
$('#options-urlsite').on('change', function() {
	if ($(this).val() == 'yallversion') {
		$('#options-urlversion').hide();
	} else {
		$('#options-urlversion').show();
	}
});

$('#download-ics').on('click', downloadics);
$('#download-pdf').on('click', downloadpdf);
$('#download-csv').on('click', downloadcsv);
$('#action-print').on('click', actionprint);

initSettingsToggle();
initThemeToggle();
initReadingModal();

function initSettingsToggle() {
	var storageKey = 'brpg-settings-collapsed',
		button = $('#toggle-settings');

	if (!button.length) {
		return;
	}

	function setCollapsed(collapsed) {
		$('body').toggleClass('settings-collapsed', collapsed);
		button
			.attr('aria-expanded', (!collapsed).toString())
			.text(collapsed ? 'Show settings' : 'Hide settings');
		localStorage.setItem(storageKey, collapsed ? '1' : '0');
	}

	setCollapsed(localStorage.getItem(storageKey) === '1');

	button.on('click', function() {
		setCollapsed(!$('body').hasClass('settings-collapsed'));
	});
}

/* Appearance: Light, Dark or Auto (follows the device). Picked in the menu (shell.js calls
   window.setThemeChoice); a saved light/dark lives in 'lamp-theme', Auto clears it. */
function initThemeToggle() {
	var storageKey = 'lamp-theme',
		media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null,
		choice = null;

	try { choice = localStorage.getItem(storageKey); } catch (e) {}
	if (choice !== 'light' && choice !== 'dark') choice = 'system';

	function apply() {
		var theme = choice === 'system' ? (media && media.matches ? 'dark' : 'light') : choice;
		document.documentElement.setAttribute('data-theme', theme);
		var meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d0d0f' : '#f7f7f8');
		$('[data-theme-choice]').each(function() {
			this.setAttribute('aria-checked', String(this.getAttribute('data-theme-choice') === choice));
		});
	}

	window.setThemeChoice = function(next) {
		choice = next === 'light' || next === 'dark' ? next : 'system';
		try {
			if (choice === 'system') localStorage.removeItem(storageKey);
			else localStorage.setItem(storageKey, choice);
		} catch (e) {}
		apply();
	};

	if (media && media.addEventListener) media.addEventListener('change', function() { if (choice === 'system') apply(); });
	apply();
}

function initReadingModal() {
	var modal = $('#reading-modal'),
		content = $('#reading-modal-content'),
		title = $('#reading-modal-title'),
		link = $('#reading-modal-link'),
		check = $('#reading-modal-check'),
		readingKey = null;

	if (!modal.length) {
		return;
	}

	function closeModal() {
		if (window.lampSheet) {
			window.lampSheet.close(modal[0], function() { content.empty(); });
		} else {
			modal.attr('aria-hidden', 'true');
			content.empty();
		}
		$('body').removeClass('reading-modal-open');
	}

	function renderPassageData(payload) {
		var html = [];

		if (!payload.passages || !payload.passages.length) {
			return '<p class="reading-modal-message">No passage text was returned.</p>';
		}

		payload.passages.forEach(function(passage) {
			if (passage.error) {
				html.push('<section class="reading-passage"><h3>' + escapeHtml(passage.reference) + '</h3><p class="reading-modal-message">Unable to load this passage.</p></section>');
				return;
			}

			var data = passage.data && passage.data.data ? passage.data.data : passage.data,
				reference = data && (data.reference || data.human_reference || data.display_reference) || passage.reference,
				contentHtml = data && (data.content || data.html || data.text || data.usfm) || '';

			var holder = document.createElement('template');
			holder.innerHTML = sanitizePassageHtml(contentHtml);

			// a ref that starts a chapter ("2KI.22" or "2KI.22.1-20") labels its first verse "22:1"
			var chapter = (String(passage.reference || '').match(/^[^.]+\.(\d+)(?:\.1(?:-\d+)?)?$/) || [])[1],
				first = holder.content.querySelector('.yv-vlbl');
			if (chapter && first && first.textContent.trim() === '1') {
				first.setAttribute('data-chapter', chapter);
			}
			markVerseBreaks(holder.content);
			var textHtml = holder.innerHTML;

			html.push('<section class="reading-passage">');
			html.push('<h3>' + escapeHtml(reference) + '</h3>');
			html.push('<div class="reading-passage-text">' + textHtml + '</div>');
			html.push('</section>');
		});

		return html.join('');
	}

	function loadPassage(button, url) {
		var refs = (button.attr('data-reading-refs') || '').split(',').filter(Boolean),
			version = $('#options-urlversion option:selected').attr('yv') || '59',
			params = new URLSearchParams();

		if (!refs.length) {
			content.html('<p class="reading-modal-message">No structured passage reference is available for this reading. Use “Open in new tab” instead.</p>');
			return;
		}

		refs.forEach(function(ref) {
			params.append('ref', ref);
		});
		params.set('version', version);

		content.html('<p class="reading-modal-message">Loading passage...</p>');

		fetch('/api/youversion/passage?' + params.toString())
			.then(function(response) {
				return response.json().then(function(payload) {
					if (!response.ok) {
						throw payload;
					}
					return payload;
				});
			})
			.then(function(payload) {
				content.html(renderPassageData(payload));
			})
			.catch(function(error) {
				content.html(
					'<p class="reading-modal-message">Could not load passage text from the YouVersion API. ' +
					'Make sure the local server is running with <code>YVP_APP_KEY</code> set, or use “Open in new tab.”</p>'
				);
				console.error('Reading API failed', error);
			});
	}

	$(document).on('click', '.reading-open', function() {
		var button = $(this),
			url = button.attr('data-reading-url'),
			readingTitle = button.attr('data-reading-title') || 'Reading';

		if (!url) {
			return;
		}

		title.text(readingTitle);
		link.attr('href', url);
		readingKey = button.attr('data-reading-key') || null;
		check.prop('hidden', !readingKey).prop('checked', !!readingKey && getLocalStorage(readingKey, false) === 'true');
		if (window.lampSheet) {
			window.lampSheet.open(modal[0]);
		} else {
			modal.attr('aria-hidden', 'false');
		}
		$('body').addClass('reading-modal-open');
		$('#reading-modal-close').focus();
		loadPassage(button, url);
	});

	modal.on('click', '[data-reading-close]', closeModal);

	// Check off the day from the sheet through the control on the page (home card's "Mark as read",
	// else the day's own checkbox) so progress, toasts and the plan view all update the usual way
	check.on('change', function() {
		var done = this.checked,
			mark = $('.js-mark').filter(function() { return this.getAttribute('data-key') === readingKey; })[0],
			box = readingKey && document.getElementById(readingKey);

		if (!readingKey) return;
		if (mark) {
			if (mark.classList.contains('is-done') !== done) mark.click();
		} else if (box && box.type === 'checkbox') {
			if (box.checked !== done) box.click();
		} else {
			setLocalStorage(readingKey, done ? 'true' : 'false');
			// streaks.js still needs to hear about it (shell.js)
			if (typeof window.onReadingMarked === 'function') window.onReadingMarked(readingKey, done);
		}
	});

	$(document).on('keydown', function(event) {
		if (event.key === 'Escape' && modal.attr('aria-hidden') === 'false') {
			closeModal();
		}
	});
}

function escapeHtml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/* For the reader's "one verse per line" setting: a hidden <br class="verse-break"> before every verse
   number that has text ahead of it in its paragraph or poetry line. CSS shows them when it's on. */
var VERSE_BLOCKS = '.p, .m, .pi, .pi1, .pi2, .mi, .pc, .nb, .q, .q1, .q2, .q3, .q4, .qm, .qm1, .qm2, .d, .li, .li1, .li2';
function markVerseBreaks(root) {
	root.querySelectorAll('.yv-vlbl').forEach(function(label) {
		var block = label.closest(VERSE_BLOCKS) || label.parentElement;
		if (!block) return;
		var range = block.ownerDocument.createRange();
		range.setStart(block, 0);
		range.setEndBefore(label);
		if (!range.toString().trim()) return;
		var br = block.ownerDocument.createElement('br');
		br.className = 'verse-break';
		var before = label.previousElementSibling && label.previousElementSibling.classList.contains('yv-v') ? label.previousElementSibling : label;
		before.parentNode.insertBefore(br, before);
	});
}

function sanitizePassageHtml(value) {
	var template = document.createElement('template');
	template.innerHTML = String(value || '');
	template.content.querySelectorAll('script, style, iframe, object, embed').forEach(function(node) {
		node.remove();
	});
	template.content.querySelectorAll('*').forEach(function(node) {
		[].slice.call(node.attributes).forEach(function(attribute) {
			if (/^on/i.test(attribute.name)) {
				node.removeAttribute(attribute.name);
			}
		});
	});
	return template.innerHTML || escapeHtml(value);
}

function enableTestaments() {
	var check = $(this);

	check
		.closest('.order-group')
			.find('input[type=checkbox]')
				.prop('disabled',false)
			.end()
		.siblings('.order-group')
			.find('input[type=checkbox]')
			.prop('disabled',true);

}

function mcheyneDivisionCheck() {
	// default to 
	$('#options-logic').val('chapters');
}

function adjustBooks() {
	var check = $(this);
	
	// OT or NT main label
	if (check.closest('label').hasClass('books-testament')) {		
		
		// set all the children to match this one
		check
			.closest('details')
			.find('input')
			.prop('checked', check.prop('checked'));
		
	} else {
		// this is all the child books

		var parent = check.closest('details').find('.books-testament input');
		
		if (check.prop('checked')) {
			// check others
			var allchecked = true;
			check.closest('.books-list').find('input').each(function() {
				if (!$(this).prop('checked')) {
					allchecked = false;
					return false;
				}
			});
			parent.prop('checked',allchecked);
		} else {
			parent.prop('checked',false);
		}
		
		
	}

	updateDisplay();
}

function actionprint() {
	print();
	return false;	
}

function downloadics() {
	var lang = $('#options-language').val();
	var code = generate(lang, 'ics');

	var blob = new Blob([code], {type: "text/calendar;charset=utf-8"});
	saveData(blob, 'bibleplan.ics');	
}

function downloadcsv() {
	var lang = $('#options-language').val();
	var code = generate(lang, 'csv');

	var blob = new Blob([code], {type: "text/csv;charset=utf-8"});
	saveData(blob, 'bibleplan.csv');	
}

function downloadpdf() {
	var doc = new jsPDF('p', 'pt', 'letter'); //({unit:'in', format:'letter'}),
		//margin = 0.75;
		margin = 50;

	// create heading
	doc.text('Bible Reading Plan', margin, margin, {align:'left'});

	// main code
	var format = $('input:radio[name="formatstyle"]:checked').val();
	var lang = $('#options-language').val();
	var html = generate(lang, format, doc);

	setTimeout(function(){
        var data = doc.output('datauri')
		//$('iframe').attr('src', data);
		$('#output').html('<iframe class="pdf" type="application/pdf" src="' + data + '"></iframe>');
    }, 10);	

	//console.log(html);

	//html = '<table><tr><td>test</td><td>cell 2</td></tr></table>';

    specialElementHandlers = {
        // element with id of "bypass" - jQuery style selector
        '#bypassme': function (element, renderer) {
            // true = "handled elsewhere, bypass text extraction"
            return true
        }
    };
    margins = {
        top: 80,
        bottom: 60,
        left: 40,
        width: 522
	};
	
	doc.fromHTML(
		html, // HTML string or DOM elem ref.
		margins.left, // x coord
		margins.top, { // y coord
			'width': margins.width, // max width of content on PDF
			'elementHandlers': specialElementHandlers
		},
	
		function (dispose) {
			// dispose: object with X, Y of the last line add to the PDF 
			//          this allow the insertion of new lines after html
			//doc.save('Test.pdf');
			var data = doc.output('datauri')
			$('#output').html('<iframe class="pdf" type="application/pdf" src="' + data + '"></iframe>');
		}, margins);	

	return;

	doc.fromHTML(html, 10, 20, { width: 50 }, {
		callback: function (doc) {
		  //doc.save();
		  var data = doc.output('datauri')
		  //$('iframe').attr('src', data);
		  $('#output').html('<iframe class="pdf" type="application/pdf" src="' + data + '"></iframe>');
			 
		}
	 });
	
	 //return;
	//

	setTimeout(function(){
        var data = doc.output('datauri')
		//$('iframe').attr('src', data);
		$('#output').html('<iframe class="pdf" type="application/pdf" src="' + data + '"></iframe>');
    }, 10)

	// demo
	

	//doc.save('bible-reading-plan.pdf')	
}


function buildpdf(lang, data, days, bookList, dayList, doc) {
	
	



	return '';
}

function generateColorListHtml() {
	var colorlist = [
			['pentateuch','Pentateuch'],
			['historical','Historical'],
			['major','Prophets'],
			['poetic','Poetic'],
			['deuterocanonical','Deuterocanonical'],
			['gospel','Gospels'],
			['acts','Acts'],
			['pauline','Pauline'],
			['general','Epistles'],
			['revelation','Revelation'],
		];
		var colorlistHtml = '<div id="color-key">';

		for (var i=0; i<colorlist.length; i++) {
			colorlistHtml += `
			<div class="key-item">
				<div class="key-color section-${colorlist[i][0]}"></div>
				<div class="key-text">${colorlist[i][1]}</div>
			</div>`;
		}
		colorlistHtml += `</div>`;

	return colorlistHtml;
}

function updateDisplay() {

	updateUrlAndTitle();

	var format = $('input:radio[name="formatstyle"]:checked').val();
	var lang = $('#options-language').val();	

	var code = generate(lang, format);

	if ($('#options-sectioncolors').is(':checked')) {
		$('#output').addClass('plan-color');

		code += generateColorListHtml();

	} else {
		$('#output').removeClass('plan-color');
	}

	if ($('#options-checkbox').is(':checked')) {
		$('#output').addClass('plan-checkbox');
	} else {
		$('#output').removeClass('plan-checkbox');
	}	

	$('#output')
		.attr('lang', lang)
		.html(code);

	if (["ar","iw","ur"].indexOf(lang) > -1) {
		$('#output').attr('dir','rtl');
	} else {
		$('#output').attr('dir','ltr');
	}

	//$('#main-header h1').html(title);
	$('#output').prepend( $('<h1 class="print-only">' + escapeHtml(currentTitle) + '</h1>') );

	if (typeof window.onPlanRendered === 'function') {
		window.onPlanRendered();
	}

}

function generate(lang, format, doc) {
	
	var 
		dateparts = $('#time-startdate')[0].value.split('-'),
		startDate = new Date(parseInt(dateparts[0], 10), parseInt(dateparts[1], 10)-1, parseInt(dateparts[2], 10)), //.val()),
		duration = parseInt($('#time-days').val(), 10),
		books = [],
		daysOfWeek = [],
		order = $('input:radio[name="bibleorder"]:checked').val();
	
	daysOfWeek = $('#section-days input:checked').map(function() { 
		return parseInt($(this).val(), 10) - 1;
	}).get();

	
 	if (order == 'traditional' || order == 'alternate' || order == 'tanakh') {
		books = $('.order-' + order + ' .books-list input[type=checkbox]:checked').map(function(index, el) { 
			return $(this).val();
		}).get();	
	} else if (order == 'chronological') {
		books = $('.order-chronological input[type=checkbox]:checked').map(function(index, el) { 
			return $(this).val();
		}).get();
	} else if (order == 'list') {
		books = [$('#options-list').val()];
	}

	// QUIRK of 2024
	if (/*startDate.getTime() == new Date(2024,0,1).getTime() && */
		(books == 'NT' || books.join(',') == 'MAT,MRK,LUK,JHN,ACT,ROM,1CO,2CO,GAL,EPH,PHP,COL,1TH,2TH,1TI,2TI,TIT,PHM,HEB,JAS,1PE,2PE,1JN,2JN,3JN,JUD,REV') && 
		daysOfWeek.join(',') == '1,2,3,4,5' && 
		(duration == 365 || duration == 366)) {
		duration == 364; //
	}

	var data = getPlanData(lang, order, startDate, duration, books, daysOfWeek, $('#options-dailypsalm').is(':checked'), $('#options-dailyproverb').is(':checked'), $('#options-otntoverlap').is(':checked'), $('#options-reverse').is(':checked'), $('#options-logic').val(), $('#options-includeurls').is(':checked'), $('#options-urlsite').val(), $('#options-urlversion').val());
	if (format !== 'ics' && format !== 'csv') {
		window.lastPlanDays = data.days.slice();
	}
	var code = window['build' + format](lang, data, startDate, duration, books, daysOfWeek, $('#options-stats').is(':checked'), $('#options-dailystats').is(':checked'), $('#options-nodates').is(':checked'), $('#options-includeurls').is(':checked'));	
	
	return code;
}

var currentKey = '';
var currentTitle = '';

function updateUrlAndTitle() {
	// params
	var start = $('#time-startdate').val(),
		total = $('#time-days').val(),
		format = $('input[name=formatstyle]:checked').val(),
		order = $('input[name=bibleorder]:checked').val(),	
		lang = $('#options-language').val(),
		logic = $('#options-logic').val(),	
		daysofweek = $( '#section-days input:checked' ).map(function() {
			return $( this ).val();
		  })
		  .get()
		  .join( ',' ),
		books = [];
	
	if (order == 'traditional' || order == 'alternate') {

		for (var i=0; i<bible.TESTAMENTS.length; i++) {
			var testament = bible.TESTAMENTS[i];

			if ($('.order-' + order + ' input[value="' + testament + '"]').is(':checked')) {
				books.push(testament);
			} else {
				$('.order-' + order + ' .section-' + testament  + ' .books-list input').each(function() {
					if ($(this).is(':checked'))
						books.push($(this).val());
				});
			}			
		}

	} else if (order == 'list') {
		books = [$('#options-list').val()];
	} else {
		for (var i=0; i<bible.TESTAMENTS.length; i++) {
			var testament = bible.TESTAMENTS[i];

			if ($('.order-chronological input[value="' + testament + '"]').is(':checked')) {
				books.push(testament);
			}
		}
		
	}


	var dailypsalm = $('#options-dailypsalm').is(':checked') ? '1' : '0',
		dailyproverb = $('#options-dailyproverb').is(':checked') ? '1' : '0';


	// things that affect the overall plan (missing: overlap)
	currentKey = [start,total,order,logic,daysofweek,books,dailypsalm,dailyproverb].join('|');

	// the shell decides when to write this to the address bar
	window.currentQuery = '?start=' + start +
				'&total=' + total +
				'&format=' + format +
				'&order=' + order +
				'&daysofweek=' + daysofweek +
				'&books=' + books.join(',') +
				'&lang=' + lang +
				'&logic=' + logic +
				'&checkbox=' + ($('#options-checkbox').is(':checked') ? '1' : '0') +
				'&colors=' + ($('#options-sectioncolors').is(':checked') ? '1' : '0') +
				'&dailypsalm=' + dailypsalm +
				'&dailyproverb=' + dailyproverb +
				'&otntoverlap=' + ($('#options-otntoverlap').is(':checked') ? '1' : '0') +
				'&reverse=' + ($('#options-reverse').is(':checked') ? '1' : '0') +
				'&stats=' + ($('#options-stats').is(':checked') ? '1' : '0') +
				'&dailystats=' + ($('#options-dailystats').is(':checked') ? '1' : '0') +
				'&nodates=' + ($('#options-nodates').is(':checked') ? '1' : '0') +
				'&includeurls=' + ($('#options-includeurls').is(':checked') ? '1' : '0') +
				'&urlsite=' + $('#options-urlsite').val() +
				'&urlversion=' + $('#options-urlversion').val();

	if (typeof window.onPlanQuery === 'function') {
		window.onPlanQuery(window.currentQuery);
	}

	var title = '';
	

    // BOOKS
    if (order == 'traditional') {
        if (books == 'OT,NT') {
            title = 'Bible Reading Plan';
        } else if (books == 'NT') {
            title = 'New Testament Reading Plan';
        } else if (books == 'OT') {
            title = 'Old Testament Reading Plan';
        } else if (books == 'DC') {
            title = 'Deuterocanonical Reading Plan';
		} else if (books == 'OT,DC,NT') {
            title = 'Bible Reading Plan (with Deuterocanonical)';			
        } else {
            title = 'Custom Reading Plan';
        }
    } else if (order == 'chronological') {
        if (books == 'OT,NT') {
        	title = 'Chronological Bible Reading Plan';
        } else if (books == 'NT') {
            title = 'Chronological NT Reading Plan';
        } else if (books == 'OT') {
            title = 'Chronological OT Reading Plan';
        }
    } else if (order == 'tanakh' || order == 'alternate') {
        if (books == 'OT,NT') {
        	title = 'Alterate Reading Plan';
        } else if (books == 'NT') {
            title = 'Gospel Writers Reading Plan';
        } else if (books == 'OT') {
            title = 'Tanakh Reading Plan';
        }		        
    } else if (order == 'mcheyne') {
        title = 'M\'Cheyne Reading Plan';
    } else if (order == 'list') {
        title = 'Reading Plan';
    }

    // extras
    if (dailypsalm == '1' && dailyproverb == '1') {
        title += ' with daily Psalm and Proverb';
    } else if (dailyproverb == '1') {
        title += ' with daily Proverb';
    } else if (dailypsalm == '1') {
        title += ' with daily Psalm';
    }

    // days

    if (daysofweek == '1,2,3,4,5,6,7') {
        title += ' - Daily Reading';
    } else if (daysofweek == '2,3,4,5,6') {
        title += ' - Weekends Off';
    } else if (daysofweek == '2,3,4,5,6,7') {
        title += ' - Sundays Off';
    } else if (daysofweek == '1,2,3,4,5,6') {
        title += ' - Saturdays Off';
    } else {
        nums = ["1","2","3","4","5","6","7"];
        days = ["S","M","T","W","R","F","S"];
		nums.forEach(function(val, index) {
			daysofweek = daysofweek.replace(val, days[index]);
		});

        title += ' - ' + daysofweek;
    }

    // date 
	var dateparts = start.split('-'),
		startDate = new Date(parseInt(dateparts[0], 10), parseInt(dateparts[1], 10)-1,parseInt(dateparts[2], 10)),
		endDate = startDate.addDays(parseInt(total, 10));

    if (total == 365 || total == 366) {
        title += ' (' + startDate.getFullYear() + ')';
    } else {
        title += ' (';

        // title += startDate.getDate() + ' ' + startDate.monthAbbr();

        // if (startDate.getFullYear() !== endDate.getFullYear()) {
        //     title += startDate.getFullYear();  
        // }

        // title += ' — ' + endDate.getDate() + ' ' + endDate.monthAbbr() + ' ' + endDate.getFullYear();

		var options = {month: 'short', day: 'numeric', year: 'numeric'};
		var startRange = startDate.toLocaleDateString(lang, options);
      
		if (startDate.getFullYear() === endDate.getFullYear()) {
            startRange = startRange.replace(/[\/\\\-\.,]?\s?\d{4}[\/\\\-\.]?/gi, '');
        }

		title += startRange + ' - ' + endDate.toLocaleDateString(lang, options);

        title += ')';
    }
	

	currentTitle = title;
}

function updateBookLists() {
	var lang = $('#options-language').val();
	
	// Traditional
	for (var i=0; i<bible.DEUTEROCANONICAL_BIBLE.length; i++) {
		var usfm = bible.DEUTEROCANONICAL_BIBLE[i],
			book = bible.BIBLE_DATA[ usfm ],
			newName = bible.getName(book, lang);


		$(`label input[value="${usfm}"]`).siblings('span').html(newName);
	}
}

function createBookLists() {

	var lang = $('#options-language').val();

	// Traditional
	for (var i=0; i<bible.TESTAMENTS.length; i++) {
		var testament = bible.TESTAMENTS[i],
			testament_list = bible[testament + "_BOOKS"];

		// find list
		var list = $('.order-traditional .section-' + testament + ' .books-list')
					.empty();	
					
		//console.log(list);

		for (var j=0; j<testament_list.length; j++) {
			var usfm = testament_list[j],
				book = bible.BIBLE_DATA[ usfm ];

			//console.log(usfm);

			list.append(
				$('<label><input type="checkbox" value="' + usfm + '"><span>' + bible.getName(book, lang) + '</span></label>')
			);
		}
	}

	// ALTERNATE 

	// Tanakh
	var tanakh_list = $('.order-alternate .section-OT .books-list').empty();
	for (var j=0; j<bible.TANAKH_BOOKS.length; j++) {
		var usfm = bible.TANAKH_BOOKS[j],
			book = bible.BIBLE_DATA[ usfm ];

		//console.log(usfm);
		tanakh_list.append(
			$('<label><input type="checkbox" value="' + usfm + '"><span>' + bible.getName(book, lang) + '</span></label>')
		);
	}

	// NT
	var gospel_writers_list = $('.order-alternate .section-NT .books-list').empty();
	for (var j=0; j<bible.GOSPEL_BOOKS.length; j++) {
		var usfm = bible.GOSPEL_BOOKS[j],
			book = bible.BIBLE_DATA[ usfm ];

		//console.log(usfm);
		gospel_writers_list.append(
			$('<label><input type="checkbox" value="' + usfm + '"><span>' + bible.getName(book, lang) + '</span></label>')
		);
	}	

}


function resetControls() {
	$('#settings, #display-sheet').find('input[type=checkbox]').prop('checked', false).prop('disabled', false);
	$('#settings input[type=radio]').prop('checked', false);
	$('#options-logic').val('words');
	$('#options-urlsite').val('verseatatime');
	$('#options-urlversion').val('NASB').show();
	$('#options-list').val('');
}

function loadFromParams(urlParams) {

	urlParams = urlParams || new URLSearchParams(window.location.search);
	resetControls();

	// lang
	var lang = '';
	if (urlParams.has('lang')) {		
		lang = urlParams.get('lang');
	} else {
		lang = 'en';
		var language = window.navigator.userLanguage || window.navigator.language;

		if (language) {
			var option = $('#options-language option[value="' + language + '"]');
			if (option.length > 0) {
				lang = language;
			} else {
				var shortLanguage = language.split('-')[0];
				option = $('#options-language option[value="' + shortLanguage + '"]');
				if (option.length > 0) {
					lang = shortLanguage;
				}
			}
		}		
	}
	$('#options-language').val(lang);


	createBookLists();


	

	// start
	var startdate = null;
	var today = new Date();
	if (urlParams.has('start')) {	
		var dateparts = urlParams.get('start').split('-');
		
		if (dateparts.length == 3) {
			startdate = new Date(parseInt(dateparts[0], 10), parseInt(dateparts[1], 10)-1,parseInt(dateparts[2], 10));
		} else if (dateparts.length == 2) {
			var year = today.getFullYear();
			// if december, shift to next year
			if (today.getMonth() == 11) {
				year++;
			}
			startdate = new Date(year, parseInt(dateparts[0], 10)-1,parseInt(dateparts[0], 10));
		}
		// time zone screws it up?
		//if (startdate) {
		//	startdate = startdate.addDays(1);
		//}
	}
	if (!startdate) {
		startdate = new Date(today.getFullYear(), today.getMonth()+1, 1);
	}
	$('#time-startdate').val(startdate.toInputField() );		
	
	// format
	var format = '';
	if (urlParams.has('format')) {		
		format = urlParams.get('format');
	} else {
		format = 'calendar';
	}
	$('input[name=formatstyle][value=' + format + ']').prop('checked', true);

	// days of week
	var daysofweek = '';
	if (urlParams.has('daysofweek')) {		
		daysofweek = urlParams.get('daysofweek')
	} else {
		daysofweek = '1,2,3,4,5,6,7';
	}
	daysofweek = daysofweek.split(',');
	for (var i=0; i<daysofweek.length; i++) {
		var dayval = daysofweek[i];
		$('#days-' + dayval).prop('checked', true);
	}

	// order
	var order = '';
	if (urlParams.has('order')) {		
		order = urlParams.get('order');
		if (order == 'tanakh') {
			order = 'alternate';
		}
	} else {
		order = 'traditional';
	}
	$('input[name=bibleorder][value=' + order + ']').prop('checked', true);
	

	// books of bible	
	var books = '';	
	switch (order) {	
		case 'traditional':
			if (urlParams.has('books')) {		
				books = urlParams.get('books');
				books = books.split(',');

				for (var i=0; i<bible.TESTAMENTS.length; i++) {
					var testament = bible.TESTAMENTS[i];

					if (books.indexOf(testament) > -1) {
						$('.order-traditional .section-' + testament + ' input	')						
							.prop('checked',true);
					}
				}
				
				for (var i=0; i<books.length; i++) {
					$('input[value="' + books[i] + '"]').prop('checked',true);
				}

			} else {
				// 
				$('.order-traditional .section-OT input').prop('checked',true);
				$('.order-traditional .section-NT input').prop('checked',true);
			}
			
			$('.order-chronological input[type=checkbox]')
				.prop('checked',true)
				.prop('disabled',true);

			$('.order-alternate input[type=checkbox]')
				.prop('checked',true)
				.prop('disabled',true);	
			break;
		case 'alternate':	
		case 'tanakh':
			if (urlParams.has('books')) {		
				books = urlParams.get('books');
				books = books.split(',');

				if (books.indexOf('OT') > -1) {
					$('.order-alternate .section-OT input').prop('checked',true);
				}
				if (books.indexOf('NT') > -1) {
					$('.order-alternate .section-NT input').prop('checked',true);
				}
				
				
				for (var i=0; i<books.length; i++) {
					$('input[value="' + books[i] + '"]').prop('checked',true);
				}
				

			} else {
				$('.order-alternate .section-OT input').prop('checked',true);
			}
			
			$('.order-traditional input[type=checkbox]')
				.prop('checked',true)
				.prop('disabled',true);

			$('.order-chronological input[type=checkbox]')
				.prop('checked',true)
				.prop('disabled',true);	
			break;

		case 'list':
			$('#options-list').val(urlParams.get('books') || '');
			break;

		default:	
	
			if (urlParams.has('books')) {		
				books = urlParams.get('books');
				books = books.split(',');

				for (var i=0; i<bible.TESTAMENTS.length; i++) {
					var testament = bible.TESTAMENTS[i];

					if (books.indexOf(testament) > -1) {
						$('.order-chronological input[value="' + testament + '"]')
							.prop('checked',true);
					}
				}
				
			} else {
				$('.order-chronological input').prop('checked',true);
			}

			$('.order-traditional input[type=checkbox]')
				.prop('checked',true)
				.prop('disabled',true);

			$('.order-alternate input[type=checkbox]')
				.prop('checked',true)
				.prop('disabled',true);			
	}
	
	// total days
	var total = null;
	if (urlParams.has('total')) {
		total = urlParams.get('total');
	}
	if (!total) {
		total = 365;
		// check for leap year
		year = startdate.getYear();
		if ( ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0) ) {
			total = 366;
		}		
	}	

	// special case for NT weekends off (when first day of the year is a weekday)
	if (
		startdate.getMonth() == 0 && // jan
		startdate.getDate() == 1 && // first
		[2,3,4,5,6].indexOf(startdate.getDay()) > -1 && // weekday 
		books == 'NT' && // NT plan
		daysofweek.join(',') == '2,3,4,5,6' && // weekend off
		(total == 366 || total == 365)) {
			total = 364;
	}

	$('#time-days').val( total );


	// options
	if (urlParams.get('checkbox') == '1' || urlParams.get('checkbox') == '' || !urlParams.has('checkbox')) {	
		$('#options-checkbox').prop('checked',true);
	}	
	if (urlParams.get('colors') == '1') {	
		$('#options-sectioncolors').prop('checked',true);	
	}
	if (urlParams.get('dailypsalm') == '1') {	
		$('#options-dailypsalm').prop('checked',true);	
	}
	if (urlParams.get('dailyproverb') == '1') {	
		$('#options-dailyproverb').prop('checked',true);	
	}
	if (urlParams.get('otntoverlap') == '1') {	
		$('#options-otntoverlap').prop('checked',true);	
	}
	if (urlParams.get('reverse') == '1') {	
		$('#options-reverse').prop('checked',true);	
	}	
	if (urlParams.get('nodates') == '1') {	
		$('#options-nodates').prop('checked',true);	
	}		
	
	// overall stats are on unless a plan turned them off
	$('#options-stats').prop('checked', urlParams.get('stats') != '0');

	if (urlParams.get('dailystats') == '1') {	
		$('#options-dailystats').prop('checked',true);	
	}	

	if (urlParams.get('includeurls') == '1') {	
		$('#options-includeurls').prop('checked',true);	
	}	
	if (urlParams.get('urlsite') != '' && urlParams.get('urlsite') != null) {	
		$('#options-urlsite').val(urlParams.get('urlsite'));	
	}
	if (urlParams.get('urlversion') != '' && urlParams.get('urlversion') != null) {	
		$('#options-urlversion').val(urlParams.get('urlversion'));	
	}				


	if (urlParams.get('logic') != '' && urlParams.get('logic') != null) {	
		$('#options-logic').val(urlParams.get('logic'));	
	}		
	

	if ($('#options-urlsite').val() == 'yallversion') {
		$('#options-urlversion').hide();
	}

	updateDisplay();
}
window.loadFromParams = loadFromParams;
