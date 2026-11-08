import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8000);

const contentTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.md': 'text/markdown; charset=utf-8',
	'.woff2': 'font/woff2',
};

function sendJson(response, status, payload) {
	response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
	response.end(JSON.stringify(payload));
}

function sendStatic(request, response) {
	const url = new URL(request.url, `http://${request.headers.host}`);
	const pathname = decodeURIComponent(url.pathname);
	const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
	let filePath = join(root, safePath);

	if (pathname.endsWith('/')) {
		filePath = join(filePath, 'index.html');
	}

	if (!existsSync(filePath) || !statSync(filePath).isFile()) {
		response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
		response.end('Not found');
		return;
	}

	response.writeHead(200, {
		'content-type': contentTypes[extname(filePath)] || 'application/octet-stream',
	});
	createReadStream(filePath).pipe(response);
}

async function handleYouVersionPassage(request, response) {
	const appKey = process.env.VITE_YOUVERSION_APP_KEY || process.env.YVP_APP_KEY;

	if (!appKey) {
		sendJson(response, 500, {
			error: 'Missing YouVersion API key',
			message: 'Set VITE_YOUVERSION_APP_KEY or YVP_APP_KEY in your environment before starting server.mjs.',
		});
		return;
	}

	const url = new URL(request.url, `http://${request.headers.host}`);
	const version = url.searchParams.get('version') || '59';
	const references = url.searchParams.getAll('ref').filter(Boolean);

	if (!references.length) {
		sendJson(response, 400, { error: 'Missing ref query parameter' });
		return;
	}

	try {
		const passages = await Promise.all(references.map(async (reference) => {
			const apiUrl = new URL(`https://api.youversion.com/v1/bibles/${encodeURIComponent(version)}/passages/${encodeURIComponent(reference)}`);
			apiUrl.searchParams.set('format', 'html');
			apiUrl.searchParams.set('include_headings', 'true');
			apiUrl.searchParams.set('include_notes', 'false');
			const apiResponse = await fetch(apiUrl, {
				headers: { 'X-YVP-App-Key': appKey },
			});
			const text = await apiResponse.text();

			if (!apiResponse.ok) {
				return {
					reference,
					error: true,
					status: apiResponse.status,
					body: text,
				};
			}

			let data;
			try {
				data = JSON.parse(text);
			} catch {
				data = { raw: text };
			}

			return { reference, data };
		}));

		sendJson(response, 200, { passages });
	} catch (error) {
		sendJson(response, 500, {
			error: 'YouVersion request failed',
			message: error.message,
		});
	}
}

createServer((request, response) => {
	const url = new URL(request.url, `http://${request.headers.host}`);

	if (url.pathname === '/api/youversion/passage') {
		handleYouVersionPassage(request, response);
		return;
	}

	sendStatic(request, response);
}).listen(port, () => {
	console.log(`Bible Reading Plan Generator running at http://localhost:${port}/`);
});
