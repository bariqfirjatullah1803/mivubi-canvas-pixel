import type { Project } from '$lib/grid';
import { HttpError, body, handler, int } from '$lib/server/api';
import { one } from '$lib/server/db';
import { principal } from '$lib/server/principal';
import { COLS, cellsToBuf, checkRevision, gapSetting, ownRow, replace, toMeta, toProject, withPlacement, type Row } from '$lib/server/projects';

export const GET = handler(async (event) => {
	const p = await principal(event);
	const r = await ownRow(event.params.id!, p);
	return { project: toProject(r), meta: toMeta(r), updatedAt: r.updated_at };
});

export const PUT = handler(async (event) => {
	const p = await principal(event);
	const r = await ownRow(event.params.id!, p);
	const { project, ifMatch } = await body<{ project: Project & { cells: number[] }; ifMatch: number }>(event);
	checkRevision(r, int(ifMatch, -1));
	if (project.columns !== r.doc.columns || project.rows !== r.doc.rows || project.palette.length !== r.doc.palette.length)
		throw new HttpError(403, 'Ukuran papan dan palet karya tidak bisa diubah.');

	const gap = await gapSetting();
	return withPlacement(async (c) => {
		const name = (project.name ?? '').slice(0, 200) || r.doc.name;
		const doc = { ...r.doc, name, updatedAt: new Date().toISOString() };
		const updated = (
			await c.query<Row>(
				`update projects set cells = $2, doc = $3::jsonb, revision = revision + 1, updated_at = now() where id = $1 returning ${COLS}`,
				[r.id, cellsToBuf(project.cells), JSON.stringify(doc)]
			)
		).rows[0];
		await replace(c, updated, gap);
		return { revision: updated.revision, updatedAt: updated.updated_at };
	});
});

export const DELETE = handler(async (event) => {
	const p = await principal(event);
	const r = await ownRow(event.params.id!, p);
	checkRevision(r, int(event.url.searchParams.get('ifMatch'), -1));
	const row = await one<{ revision: number; purge_after: string }>(
		`update projects set deleted_at = now(), purge_after = now() + interval '7 days', revision = revision + 1, updated_at = now()
		 where id = $1 returning revision, purge_after`,
		[r.id]
	);
	await one('delete from placements where project_id = $1', [r.id]);
	return { revision: row!.revision, purgeAfter: row!.purge_after };
});
