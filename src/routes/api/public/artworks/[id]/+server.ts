import { HttpError, handler } from '$lib/server/api';
import { one } from '$lib/server/db';
import { COLS, eligible, toPublic, type Row } from '$lib/server/projects';

export const GET = handler(async (event) => {
	const r = await one<Row & { px: number; py: number; pw: number; ph: number; pgap: number }>(
		`select ${COLS.split(', ').map((c) => 'p.' + c).join(', ')}, pl.x px, pl.y py, pl.w pw, pl.h ph, pl.gap pgap
		 from projects p left join placements pl on pl.project_id = p.id where p.id = $1`,
		[event.params.id]
	);
	if (!r || !eligible(r) || r.px === null) throw new HttpError(404, 'Karya ini sudah tidak tersedia untuk publik.');
	return toPublic(r);
});
