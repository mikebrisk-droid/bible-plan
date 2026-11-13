/* Read-aloud in the reading sheet: the Listen button speaks the open passage with Kokoro-82M, run in
   the reader's own browser by voice-worker.js (no server). The first Listen downloads the model once
   (~326 MB on WebGPU, ~92 MB on the CPU fallback; cached after); the button shows that as a ring. Text goes over in sentence groups,
   a few seconds ahead of what's playing, through Web Audio so pause and resume are instant.
   Stops when the sheet closes or a new passage loads. */
(function () {
	'use strict';

	var VOICE = 'am_michael';   // Kokoro voices: am_michael, am_puck, am_fenrir, am_echo, af_heart, ... (VOICES.md)
	var SPEED = 1;
	var AHEAD = 20;             // seconds of audio to have ready before asking for more
	var MAX_CHUNK = 260;        // characters per request; Kokoro reads up to ~510 phonemes at a time

	var modal = document.getElementById('reading-modal'),
		content = document.getElementById('reading-modal-content'),
		button = document.getElementById('reading-modal-voice');
	// Not on phones and tablets: the model download (92–326 MB) and the CPU it takes are too much there
	var mobile = window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches;
	if (mobile || !modal || !content || !button || !window.Worker || !(window.AudioContext || window.webkitAudioContext)) {
		if (button) button.hidden = true;
		return;
	}

	var worker = null, ready = false, files = {},
		ctx = null, state = 'idle',        // idle | loading | playing | paused
		session = 0, chunks = [], next = 0, inFlight = false,
		playAt = 0, sources = [], ended = 0;

	/* ---------- Text ---------- */

	// "Genesis 1" -> "Genesis, chapter 1"; "Matthew 1:1–17" -> "Matthew, chapter 1, verses 1 to 17"
	function spokenReference(ref) {
		var m = /^(.*?)\s+(\d+)(?::(\d+)(?:\s*[–-]\s*(\d+))?)?$/.exec(ref.trim());
		if (!m) return ref;
		var book = m[1], psalm = /^psalms?$/i.test(book);
		var out = psalm ? 'Psalm ' + m[2] : book + ', chapter ' + m[2];
		if (m[3]) out += m[4] ? ', verses ' + m[3] + ' to ' + m[4] : ', verse ' + m[3];
		return out + '.';
	}

	// The passage as plain text: no verse numbers, editors' headings, cross references or notes
	function passageText(section) {
		var body = section.querySelector('.reading-passage-text');
		if (!body) return '';
		var clone = body.cloneNode(true);
		clone.querySelectorAll('.yv-vlbl, .yv-h, .r, .sr, .mr, .ms, .ms1, .ms2, .cl, .note, .yv-n, .f, .x, .fr, .ft, sup, .verse-break')
			.forEach(function (el) { el.remove(); });
		// keep words in neighbouring blocks (paragraphs, poetry lines) apart
		clone.querySelectorAll('div, p, span[class^="q"], br').forEach(function (el) { el.append(' '); });
		return clone.textContent.replace(/\s+/g, ' ')
			// the divine name printed in capitals ("LORD", "GOD") would be spelled out letter by letter
			.replace(/\b(LORD|GOD|JEHOVAH)\b/g, function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); })
			.trim();
	}

	// Split text after the given punctuation, keeping closing quotes and brackets with it
	function splitAfter(text, marks) {
		var re = new RegExp('[^' + marks + ']+(?:[' + marks + ']+["\'”’)\\]]*|$)\\s*', 'g');
		return (text.match(re) || []).map(function (s) { return s.trim(); }).filter(Boolean);
	}

	// Whole sentences, grouped up to MAX_CHUNK characters, so the pause between groups falls at a full
	// stop; only a sentence too long for one group breaks, at semicolons and colons, then commas
	function toChunks(text) {
		var pieces = [], out = [], cur = '';
		splitAfter(text, '.!?').forEach(function (sentence) {
			if (sentence.length <= MAX_CHUNK) { pieces.push(sentence); return; }
			splitAfter(sentence, ';:').forEach(function (clause) {
				pieces = pieces.concat(clause.length <= MAX_CHUNK ? [clause] : splitAfter(clause, ','));
			});
		});
		pieces.forEach(function (p) {
			if (cur && (cur + ' ' + p).length > MAX_CHUNK) { out.push(cur); cur = ''; }
			cur = cur ? cur + ' ' + p : p;
		});
		if (cur) out.push(cur);
		return out;
	}

	function collect() {
		var out = [];
		content.querySelectorAll('.reading-passage').forEach(function (section) {
			var h = section.querySelector('h3'), text = passageText(section);
			if (!text) return;
			if (h) out.push(spokenReference(h.textContent));
			out = out.concat(toChunks(text));
		});
		return out;
	}

	/* ---------- Worker ---------- */

	function startWorker() {
		if (worker) return;
		worker = new Worker('voice-worker.js', { type: 'module' });
		worker.onmessage = function (e) {
			var msg = e.data;
			if (msg.type === 'progress') {
				files[msg.file] = msg;
				var loaded = 0, total = 0, k;
				for (k in files) { loaded += files[k].loaded; total += files[k].total; }
				setProgress(total ? loaded / total : 0);
			} else if (msg.type === 'ready') {
				ready = true;
				remember();
				if (state === 'loading') begin();
			} else if (msg.type === 'audio') {
				inFlight = false;
				// audio from a reading that was stopped: drop it, but keep a newer reading moving
				if (msg.id !== session || state === 'idle') { pump(); return; }
				schedule(msg.samples, msg.rate);
				pump();
			} else if (msg.type === 'error') {
				inFlight = false;
				console.error('Read-aloud failed', msg.message);
				stop();
				if (window.ding) window.ding.error('Couldn’t start the voice', { description: 'Check your connection and try again.' });
			}
		};
		worker.onerror = function (e) {
			console.error('Read-aloud worker failed', e.message || e);
			worker = null; ready = false;
			stop();
			if (window.ding) window.ding.error('Read-aloud isn’t available in this browser');
		};
	}

	/* ---------- Getting ready ahead of time ----------
	   The model is cached after the first Listen, but the graphics chip still takes several seconds to
	   set it up on each page load. Once someone has listened on this device, that setup starts as soon as
	   a reading opens, so Listen speaks right away. Devices that never listen download nothing. */

	var USED_KEY = 'rtb-voice', warming = false;

	function remember() { try { localStorage.setItem(USED_KEY, '1'); } catch (e) {} }
	function usedBefore() { try { return localStorage.getItem(USED_KEY) === '1'; } catch (e) { return false; } }

	function prewarm() {
		if (ready || warming || !usedBefore()) return;
		warming = true;
		startWorker();
		worker.postMessage({ type: 'load', voice: VOICE });
	}

	/* ---------- Playback ---------- */

	function schedule(samples, rate) {
		var buffer = ctx.createBuffer(1, samples.length, rate);
		buffer.copyToChannel ? buffer.copyToChannel(samples, 0) : buffer.getChannelData(0).set(samples);
		var src = ctx.createBufferSource();
		src.buffer = buffer;
		src.connect(ctx.destination);
		// a short breath between sentence groups
		playAt = Math.max(playAt, ctx.currentTime + 0.05);
		src.start(playAt);
		playAt += buffer.duration + 0.18;
		sources.push(src);
		var mine = session;
		src.onended = function () {
			if (mine !== session) return;
			ended++;
			if (ended === chunks.length) stop();
		};
	}

	// Ask for the next group while less than AHEAD seconds are waiting to play
	function pump() {
		if (inFlight || next >= chunks.length || state === 'idle') return;
		if (playAt - ctx.currentTime > AHEAD) { setTimeout(pump, 1000); return; }
		inFlight = true;
		worker.postMessage({ type: 'speak', id: session, text: chunks[next++], voice: VOICE, speed: SPEED });
	}

	function begin() {
		chunks = collect();
		if (!chunks.length) { stop(); return; }
		next = 0; ended = 0; sources = []; playAt = 0;
		setState('playing');
		pump();
	}

	function play() {
		var AC = window.AudioContext || window.webkitAudioContext;
		// created and resumed inside the tap, so Safari lets it make sound
		if (!ctx) ctx = new AC();
		if (ctx.state === 'suspended') ctx.resume();
		session++;
		startWorker();
		if (ready) { begin(); return; }
		setState('loading');
		worker.postMessage({ type: 'load', voice: VOICE });
	}

	function stop() {
		session++;
		sources.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) {} });
		sources = []; chunks = []; next = 0; ended = 0; playAt = 0;
		if (ctx && ctx.state === 'suspended') ctx.resume();
		setState('idle');
	}

	/* ---------- Button ---------- */

	function setProgress(p) {
		button.style.setProperty('--voice-progress', Math.round(p * 100) + '%');
		// after the download, the model still takes a few seconds to start on the graphics chip
		if (state === 'loading') button.setAttribute('aria-label', p >= 1 ? 'Preparing voice' : 'Downloading voice, ' + Math.round(p * 100) + '%');
	}

	function setState(s) {
		state = s;
		button.dataset.state = s;
		button.setAttribute('aria-pressed', String(s === 'playing' || s === 'loading'));
		button.setAttribute('aria-label', s === 'playing' ? 'Pause' : s === 'paused' ? 'Resume listening' : s === 'loading' ? 'Downloading voice' : 'Listen');
		button.title = s === 'loading' ? 'Downloading the voice (once)' : '';
		if (s !== 'loading') setProgress(0);
	}

	// Listen once a passage has loaded
	function sync() {
		button.disabled = !content.querySelector('.reading-passage-text');
	}

	button.addEventListener('click', function () {
		if (state === 'idle') play();
		else if (state === 'loading') stop();
		else if (state === 'playing') { ctx.suspend(); setState('paused'); }
		else if (state === 'paused') { ctx.resume(); setState('playing'); }
	});

	// a new passage or a closed sheet ends the reading
	new MutationObserver(function () { stop(); sync(); }).observe(content, { childList: true });
	new MutationObserver(function () { if (modal.getAttribute('aria-hidden') === 'true') stop(); else prewarm(); })
		.observe(modal, { attributes: true, attributeFilter: ['aria-hidden'] });

	setState('idle');
	sync();
})();
