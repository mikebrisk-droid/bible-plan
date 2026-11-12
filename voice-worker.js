/* Read-aloud voice: runs Kokoro-82M (Apache-2.0, hexgrad/Kokoro-82M) in a worker, so generating
   speech never blocks scrolling. voice.js sends text one sentence group at a time and gets raw audio
   back. The model downloads once per device and the browser caches it.

   On the graphics chip (WebGPU) the full model (fp32, ~326 MB) speaks about 14x faster than real
   time on an M4 Max; the smaller CPU model (q8, ~92 MB, WebAssembly, one thread) runs a little
   slower than real time there, so it is only the fallback for devices without WebGPU. */

const KOKORO = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

let ttsPromise = null, warmed = false;

async function hasWebGPU() {
	try { return !!(self.navigator.gpu && await self.navigator.gpu.requestAdapter()); } catch (e) { return false; }
}

function open(KokoroTTS, dtype, device) {
	return KokoroTTS.from_pretrained(MODEL, {
		dtype,
		device,
		progress_callback: (p) => {
			// one message per file as it downloads; voice.js sums them into a single percentage
			if (p.status === 'progress' && p.total) self.postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total });
		}
	});
}

function load() {
	if (!ttsPromise) {
		ttsPromise = (async () => {
			const { KokoroTTS } = await import(KOKORO);
			if (await hasWebGPU()) {
				try { return await open(KokoroTTS, 'fp32', 'webgpu'); } catch (e) { /* fall through to the CPU model */ }
			}
			return open(KokoroTTS, 'q8', 'wasm');
		})();
		ttsPromise.catch(() => { ttsPromise = null; });
	}
	return ttsPromise;
}

self.onmessage = async (event) => {
	const msg = event.data;
	try {
		if (msg.type === 'load') {
			const tts = await load();
			// the first generation sets up the graphics chip (~2 s); do it now, on a word nobody hears
			if (!warmed) { await tts.generate('Amen.', { voice: msg.voice }); warmed = true; }
			self.postMessage({ type: 'ready' });
		} else if (msg.type === 'speak') {
			const tts = await load();
			const audio = await tts.generate(msg.text, { voice: msg.voice, speed: msg.speed || 1 });
			const samples = audio.audio;
			self.postMessage({ type: 'audio', id: msg.id, samples, rate: audio.sampling_rate }, [samples.buffer]);
		}
	} catch (error) {
		self.postMessage({ type: 'error', id: msg.id, message: String(error && error.message || error) });
	}
};
