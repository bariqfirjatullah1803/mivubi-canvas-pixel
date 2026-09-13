import { canvasError, type CanvasSettings, type SiteColor } from '$lib/grid';
import { q } from '$lib/server/db';
import { HttpError, body, handler, int, requireAdmin } from '$lib/server/api';
import { readSettings } from '$lib/server/settings';

export const GET = handler(() => readSettings());

export const PATCH = handler(async (event) => {
	requireAdmin(event);
	const patch = await body<{ canvas?: CanvasSettings; palette?: SiteColor[]; gap?: number }>(event);
	if (patch.canvas) {
		const err = canvasError(patch.canvas);
		if (err) throw new HttpError(400, err);
		await q('update settings set canvas_width_mm = $1, canvas_height_mm = $2, canvas_cell_mm = $3, updated_at = now() where id = 1', [
			patch.canvas.widthMm,
			patch.canvas.heightMm,
			patch.canvas.cellMm
		]);
	}
	if (patch.palette) {
		if (!Array.isArray(patch.palette) || patch.palette.length < 1 || patch.palette.length > 32)
			throw new HttpError(400, 'Palet harus berisi 1–32 warna.');
		await q('update settings set palette = $1::jsonb, updated_at = now() where id = 1', [JSON.stringify(patch.palette)]);
	}
	if (patch.gap !== undefined) {
		const gap = int(patch.gap, -1);
		if (gap < 0 || gap > 256) throw new HttpError(400, 'Gap World harus bilangan bulat 0–256.');
		await q('update settings set gap = $1, updated_at = now() where id = 1', [gap]);
	}
	return readSettings();
});
