import { templateError, type Template } from '$lib/grid';
import { one, q } from '$lib/server/db';
import { HttpError, body, handler, requireAdmin } from '$lib/server/api';

type Row = { id: string; name: string; colors: Record<string, string>; rows: string[] };
const MAX = 24;

const listTemplates = () => q<Row>('select id, name, colors, rows from templates order by position, updated_at');

export const GET = handler(() => listTemplates());

export const POST = handler(async (event) => {
	requireAdmin(event);
	const t = await body<Template>(event);
	const err = templateError(t);
	if (err) throw new HttpError(400, err);
	// Hanya simbol yang terpakai yang ikut tersimpan.
	const used = new Set([...t.rows.join('')].filter((c) => c !== '.'));
	const colors = Object.fromEntries([...used].map((c) => [c, t.colors[c].toUpperCase()]));
	const name = t.name.trim().slice(0, 80);

	if (t.id) {
		const row = await one<Row>(
			'update templates set name = $2, colors = $3::jsonb, rows = $4::jsonb, updated_at = now() where id = $1 returning id, name, colors, rows',
			[t.id, name, JSON.stringify(colors), JSON.stringify(t.rows)]
		);
		if (row) return row;
	}
	const n = Number((await one<{ n: string }>('select count(*) n from templates'))!.n);
	if (n >= MAX) throw new HttpError(400, `Maksimal ${MAX} referensi.`);
	return one<Row>(
		'insert into templates (name, colors, rows, position) values ($1, $2::jsonb, $3::jsonb, $4) returning id, name, colors, rows',
		[name, JSON.stringify(colors), JSON.stringify(t.rows), n + 1]
	);
});
