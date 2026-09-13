import { canvasError, filledCount, type Project } from '$lib/grid';
import { HttpError, body, handler } from '$lib/server/api';
import { one, q } from '$lib/server/db';
import { principal } from '$lib/server/principal';
import { COLS, cellsToBuf, toMeta, toSummary, type Row } from '$lib/server/projects';
import { readSettings } from '$lib/server/settings';

export const GET = handler(async (event) => {
	const p = await principal(event);
	const rows = p.userId
		? await q<Row>(`select ${COLS} from projects where owner_user_id = $1 and deleted_at is null order by updated_at desc`, [p.userId])
		: await q<Row>(
				`select ${COLS} from projects where owner_device_id = $1 and owner_user_id is null and deleted_at is null order by updated_at desc`,
				[p.deviceId]
			);
	return rows.map(toSummary);
});

export const POST = handler(async (event) => {
	const p = await principal(event);
	const doc = await body<Project & { cells: number[] }>(event);
	const s = await readSettings();
	if (canvasError({ widthMm: doc.widthMm, heightMm: doc.heightMm, cellMm: doc.cellMm }))
		throw new HttpError(400, 'Ukuran papan tidak sah.');
	if (doc.widthMm !== s.canvas.widthMm || doc.heightMm !== s.canvas.heightMm || doc.cellMm !== s.canvas.cellMm)
		throw new HttpError(400, 'Ukuran papan berubah. Muat ulang studio sebelum membuat karya.');
	const same = doc.palette.length === s.palette.length && doc.palette.every((c, i) => c.hex === s.palette[i].hex);
	if (!same) throw new HttpError(409, 'Palet Website telah berubah. Muat ulang studio sebelum membuat karya.');
	if (await one('select id from projects where id = $1', [doc.id])) throw new HttpError(409, 'ID karya sudah dipakai.');

	const { cells, ...rest } = doc;
	if (cells.length !== doc.columns * doc.rows) throw new HttpError(400, 'Jumlah sel tidak cocok dengan ukuran papan.');
	void filledCount;
	const row = await one<Row>(
		`insert into projects (id, owner_user_id, owner_device_id, doc, cells) values ($1, $2, $3, $4::jsonb, $5) returning ${COLS}`,
		[doc.id, p.userId, p.userId ? null : p.deviceId, JSON.stringify(rest), cellsToBuf(cells)]
	);
	return toMeta(row!);
});
