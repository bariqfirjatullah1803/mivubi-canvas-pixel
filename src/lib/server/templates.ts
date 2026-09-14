// Referensi sebagai karya Admin: tiap pola punya satu karya publik milik akun sistem MIVUBI,
// jadi ia ikut tampil di Canvas World, papan landing, dan halaman /art tanpa jalur render baru.
import { applyTemplate, createProject, type Template } from '$lib/grid';
import { COLS, cellsToBuf, gapSetting, replace, type Row } from './projects';
import { one, q, tx } from './db';
import { readSettings } from './settings';

export const SYSTEM_USER = '00000000-0000-4000-8000-000000000001';
export const SYSTEM_CREATOR = 'MIVUBI';

type TemplateRow = Template & { project_id: string | null };

/** Buat atau perbarui karya untuk satu referensi. Pola dipasang seperti saat pengunjung menempelnya. */
export async function syncTemplateArtwork(t: TemplateRow): Promise<string> {
	if (!(await one('select id from users where id = $1', [SYSTEM_USER])))
		throw new Error('Akun sistem MIVUBI belum ada. Jalankan npm run db:migrate.');
	const s = await readSettings();
	const { cells, ...doc } = applyTemplate(createProject(s.canvas, s.palette, t.name), t);
	const gap = await gapSetting();

	return tx(async (c) => {
		let row: Row | undefined;
		if (t.project_id)
			row = (
				await c.query<Row>(
					`update projects set doc = $2::jsonb, cells = $3, title = $4, revision = revision + 1, updated_at = now()
					 where id = $1 returning ${COLS}`,
					[t.project_id, JSON.stringify({ ...doc, id: t.project_id }), cellsToBuf(cells), t.name]
				)
			).rows[0];
		if (!row) {
			row = (
				await c.query<Row>(
					`insert into projects (id, owner_user_id, doc, cells, visibility, saved_at, title, creator_name)
					 values ($1, $2, $3::jsonb, $4, 'public', now(), $5, $6) returning ${COLS}`,
					[doc.id, SYSTEM_USER, JSON.stringify(doc), cellsToBuf(cells), t.name, SYSTEM_CREATOR]
				)
			).rows[0];
			await c.query('update templates set project_id = $2 where id = $1', [t.id, row.id]);
		}
		await replace(c, row, gap);
		return row.id;
	});
}

export const deleteTemplateArtwork = (projectId: string | null) =>
	projectId ? q('delete from projects where id = $1 and owner_user_id = $2', [projectId, SYSTEM_USER]) : Promise.resolve([]);

/** Referensi lama yang belum punya karya. Aman dijalankan berulang. */
export async function backfillTemplateArtworks() {
	const rows = await q<TemplateRow>('select id, name, colors, rows, project_id from templates where project_id is null order by position');
	for (const t of rows) await syncTemplateArtwork(t);
	return rows.length;
}
