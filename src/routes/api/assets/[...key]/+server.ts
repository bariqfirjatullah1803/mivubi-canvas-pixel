// Berkas R2 dilayani lewat server sendiri: tidak ada URL bertanda tangan yang bocor ke klien.
import { error } from '@sveltejs/kit';
import { getObject } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const key = params.key;
	if (!key || key.includes('..')) error(400, 'Kunci berkas tidak sah.');
	const res = await getObject(key);
	if (!res.ok || !res.body) error(res.status === 404 ? 404 : 502, 'Berkas tidak dapat diambil.');
	return new Response(res.body, {
		headers: {
			'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
