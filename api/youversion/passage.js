export default async function handler(request, response) {
	const appKey = process.env.VITE_YOUVERSION_APP_KEY || process.env.YVP_APP_KEY;

	if (!appKey) {
		response.status(500).json({
			error: 'Missing YouVersion API key',
			message: 'Add VITE_YOUVERSION_APP_KEY or YVP_APP_KEY to this project’s Vercel environment variables.',
		});
		return;
	}

	const url = new URL(request.url, `https://${request.headers.host || 'localhost'}`);
	const version = url.searchParams.get('version') || '59';
	const references = url.searchParams.getAll('ref').filter(Boolean);

	if (!references.length) {
		response.status(400).json({ error: 'Missing ref query parameter' });
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

		response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
		response.status(200).json({ passages });
	} catch (error) {
		response.status(500).json({
			error: 'YouVersion request failed',
			message: error.message,
		});
	}
}
