import { HttpError, body, handler, requireAdmin, str } from '$lib/server/api';
import { one } from '$lib/server/db';
import { COLS, gapSetting, replace, toMeta, withPlacement, type Row } from '$lib/server/projects';

export const POST = handler(async (event) => {
	requireAdmin(event);
	const { action, reason } = await body<{ action: 'take-down' | 'restore'; reason?: string }>(event);
	const id = event.params.id!;
	const r = await one<Row>(`select ${COLS} from projects where id = $1`, [id]);
	if (!r || !r.saved_at || r.deleted_at) throw new HttpError(404, 'Karya tidak ditemukan untuk moderasi.');

	const gap = await gapSetting();
	return withPlacement(async (c) => {
		let row: Row;
		if (action === 'take-down') {
			const why = str(reason, 500);
			if (!why) throw new HttpError(400, 'Alasan takedown wajib diisi.');
			// T15: moderasi tidak menaikkan revision agar Studio pemilik tidak kena konflik.
			row = (
				await c.query<Row>(`update projects set taken_down_at = now(), takedown_reason = $2 where id = $1 returning ${COLS}`, [id, why])
			).rows[0];
		} else {
			row = (
				await c.query<Row>(`update projects set taken_down_at = null, takedown_reason = null where id = $1 returning ${COLS}`, [id])
			).rows[0];
		}
		await replace(c, row, gap);
		return toMeta(row);
	});
});
