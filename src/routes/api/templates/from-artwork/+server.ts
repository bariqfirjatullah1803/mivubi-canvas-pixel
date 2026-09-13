import { templateError, templateFromProject } from '$lib/grid';
import { HttpError, body, handler, requireAdmin } from '$lib/server/api';
import { one } from '$lib/server/db';
import { COLS, toProject, type Row } from '$lib/server/projects';

export const POST = handler(async (event) => {
	requireAdmin(event);
	const { id } = await body<{ id: string }>(event);
	const r = await one<Row>(`select ${COLS} from projects where id = $1 and deleted_at is null`, [id]);
	if (!r) throw new HttpError(404, 'Karya tidak ditemukan.');
	const project = toProject(r);
	const tpl = templateFromProject({ ...project, cells: Uint16Array.from(project.cells) }, r.title ?? r.doc.name);
	if (!tpl) throw new HttpError(400, 'Karya ini masih kosong, tidak ada pola yang bisa diambil.');
	const err = templateError(tpl);
	if (err) throw new HttpError(400, `${err} Karya terlalu besar untuk dijadikan referensi.`);
	const n = Number((await one<{ n: string }>('select count(*) n from templates'))!.n);
	if (n >= 24) throw new HttpError(400, 'Maksimal 24 referensi.');
	return one(
		'insert into templates (name, colors, rows, position) values ($1, $2::jsonb, $3::jsonb, $4) returning id, name, colors, rows',
		[tpl.name, JSON.stringify(tpl.colors), JSON.stringify(tpl.rows), n + 1]
	);
});
