// Unggah desain poster: PNG masuk R2, database hanya memegang kuncinya (PRD FR-POSTER-04).
import { randomUUID } from 'node:crypto';
import { one } from '$lib/server/db';
import { HttpError, handler, requireAdmin } from '$lib/server/api';
import { DEFAULT_POSTER_AREA, POSTER_H, POSTER_W } from '$lib/render';
import { deleteObject, putObject } from '$lib/server/r2';
import { rowToTemplate, type PosterRow } from '$lib/server/posters';

const MAX_BYTES = 1_000_000;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Ukuran diambil dari IHDR, bukan dari klaim klien. */
function pngSize(buf: Uint8Array) {
	if (buf.length < 24 || PNG.some((b, i) => buf[i] !== b)) throw new HttpError(400, 'Berkas bukan PNG yang sah.');
	const view = new DataView(buf.buffer, buf.byteOffset);
	return { w: view.getUint32(16), h: view.getUint32(20) };
}

export const POST = handler(async (event) => {
	requireAdmin(event);
	const type = event.request.headers.get('content-type') ?? '';
	if (!type.includes('image/png')) throw new HttpError(400, 'Desain harus berkas PNG.');
	const bytes = new Uint8Array(await event.request.arrayBuffer());
	if (bytes.byteLength > MAX_BYTES) throw new HttpError(413, 'Data template terlalu besar. Maksimal 1 MB.');
	const { w, h } = pngSize(bytes);
	if (w !== POSTER_W || h !== POSTER_H)
		throw new HttpError(400, `Ukuran desain harus tepat ${POSTER_W} × ${POSTER_H} piksel, bukan ${w} × ${h}.`);

	const key = `poster-templates/${event.params.id}/${randomUUID()}.png`;
	await putObject(key, bytes.buffer as ArrayBuffer, 'image/png');
	const row = await one<{ asset_key: string | null }>(
		`update poster_templates set kind = 'image', asset_key = $2, preset_id = null,
		        area = coalesce(area, $3::jsonb), updated_at = now()
		 where id = $1 returning id, name, kind, preset_id, asset_key, area, updated_at, (select asset_key from poster_templates where id = $1) as old_key`,
		[event.params.id, key, JSON.stringify(DEFAULT_POSTER_AREA)]
	);
	if (!row) throw new HttpError(404, 'Template poster tidak ditemukan.');
	const old = (row as unknown as { old_key: string | null }).old_key;
	if (old && old !== key) await deleteObject(old).catch(() => {});
	return rowToTemplate(row as unknown as PosterRow);
});
