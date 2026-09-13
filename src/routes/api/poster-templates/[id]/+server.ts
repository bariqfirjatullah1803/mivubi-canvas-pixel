import { one, q } from '$lib/server/db';
import { HttpError, body, handler, requireAdmin, str } from '$lib/server/api';
import { POSTER_H, POSTER_W, type PosterArea } from '$lib/render';
import { deleteObject } from '$lib/server/r2';
import { rowToTemplate, type PosterRow } from '$lib/server/posters';

function clampArea(a: PosterArea): PosterArea {
	const int = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
	const x = int(a.x, POSTER_W - 1),
		y = int(a.y, POSTER_H - 1);
	return { x, y, width: Math.max(1, int(a.width, POSTER_W - x)), height: Math.max(1, int(a.height, POSTER_H - y)) };
}

export const PATCH = handler(async (event) => {
	requireAdmin(event);
	const patch = await body<{ name?: string; area?: PosterArea }>(event);
	const name = patch.name === undefined ? null : str(patch.name, 60);
	if (name !== null && (name.length < 1 || name.length > 60)) throw new HttpError(400, 'Nama template 1–60 karakter.');
	const row = await one(
		`update poster_templates set name = coalesce($2, name), area = coalesce($3::jsonb, area), updated_at = now()
		 where id = $1 returning id, name, kind, preset_id, asset_key, area, updated_at`,
		[event.params.id, name, patch.area ? JSON.stringify(clampArea(patch.area)) : null]
	);
	if (!row) throw new HttpError(404, 'Template poster tidak ditemukan.');
	return rowToTemplate(row as PosterRow);
});

export const DELETE = handler(async (event) => {
	requireAdmin(event);
	// FR-POSTER-01: minimal satu template harus tersisa, kalau tidak dialog Bagikan kosong.
	const n = Number((await one<{ n: string }>('select count(*) n from poster_templates'))!.n);
	if (n <= 1) throw new HttpError(400, 'Minimal satu template poster harus ada.');
	const row = await one<{ asset_key: string | null }>('delete from poster_templates where id = $1 returning asset_key', [event.params.id]);
	if (!row) throw new HttpError(404, 'Template poster tidak ditemukan.');
	if (row.asset_key) await deleteObject(row.asset_key).catch(() => {});
	return { ok: true };
});
