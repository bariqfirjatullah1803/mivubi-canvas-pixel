import { EMPTY } from '$lib/grid';
import { HttpError, body, handler, int, str } from '$lib/server/api';
import { principal } from '$lib/server/principal';
import { COLS, bufToCells, checkRevision, gapSetting, ownRow, replace, toMeta, withPlacement, type Row } from '$lib/server/projects';

type SaveInput = { title: string; creatorName: string; socialHandle: string; visibility: 'private' | 'public'; ifMatch: number };

export const POST = handler(async (event) => {
	const p = await principal(event);
	const r = await ownRow(event.params.id!, p);
	const input = await body<SaveInput>(event);
	checkRevision(r, int(input.ifMatch, -1));

	const title = str(input.title, 201),
		creator = str(input.creatorName, 81),
		social = str(input.socialHandle, 121);
	if (title.length > 200) throw new HttpError(400, 'Judul maksimal 200 karakter.');
	if (creator.length > 80) throw new HttpError(400, 'Nama kreator maksimal 80 karakter.');
	if (social.length > 120) throw new HttpError(400, 'Akun sosial maksimal 120 karakter.');
	const visibility = input.visibility === 'public' ? 'public' : 'private';
	if (visibility === 'public' && !bufToCells(r.cells).some((c) => c !== EMPTY))
		throw new HttpError(400, 'Isi minimal satu pixel sebelum menayangkan karya.');

	const gap = await gapSetting();
	return withPlacement(async (c) => {
		const doc = title ? { ...r.doc, name: title } : r.doc;
		const row = (
			await c.query<Row>(
				`update projects set title = $2, creator_name = $3, social_handle = $4, visibility = $5,
				        saved_at = coalesce(saved_at, now()), doc = $6::jsonb, revision = revision + 1, updated_at = now()
				 where id = $1 returning ${COLS}`,
				[r.id, title || null, creator || null, social || null, visibility, JSON.stringify(doc)]
			)
		).rows[0];
		await replace(c, row, gap);
		return toMeta(row);
	});
});
