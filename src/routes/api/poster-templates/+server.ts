import { one } from '$lib/server/db';
import { HttpError, handler, requireAdmin } from '$lib/server/api';
import { DEFAULT_POSTER_AREA } from '$lib/render';
import { listPosters, rowToTemplate, type PosterRow } from '$lib/server/posters';

export const GET = handler(() => listPosters());

const MAX = 8;

export const POST = handler(async (event) => {
	requireAdmin(event);
	const n = Number((await one<{ n: string }>('select count(*) n from poster_templates'))!.n);
	if (n >= MAX) throw new HttpError(400, `Maksimal ${MAX} template poster.`);
	const row = await one<PosterRow>(
		`insert into poster_templates (name, kind, area, position) values ($1, 'image', $2::jsonb, $3)
		 returning id, name, kind, preset_id, asset_key, area, updated_at`,
		['Template baru', JSON.stringify(DEFAULT_POSTER_AREA), n + 1]
	);
	return rowToTemplate(row!);
});
