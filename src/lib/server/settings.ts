import type { CanvasSettings, SiteColor } from '$lib/grid';
import { HttpError } from './api';
import { one } from './db';

type Row = { canvas_width_mm: number; canvas_height_mm: number; canvas_cell_mm: number; gap: number; palette: SiteColor[] };

export async function readSettings() {
	const r = await one<Row>('select canvas_width_mm, canvas_height_mm, canvas_cell_mm, gap, palette from settings where id = 1');
	if (!r) throw new HttpError(500, 'Pengaturan pameran belum ada di database.');
	return {
		canvas: { widthMm: r.canvas_width_mm, heightMm: r.canvas_height_mm, cellMm: r.canvas_cell_mm } satisfies CanvasSettings,
		palette: r.palette,
		gap: r.gap
	};
}
