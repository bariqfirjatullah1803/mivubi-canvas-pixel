import { q } from './db';
import type { PosterArea } from '$lib/render';

export type PosterRow = {
	id: string;
	name: string;
	kind: 'preset' | 'image';
	preset_id: string | null;
	asset_key: string | null;
	area: PosterArea | null;
	updated_at: string;
};

export const rowToTemplate = (r: PosterRow) => ({
	id: r.id,
	name: r.name,
	kind: r.kind,
	presetId: r.preset_id ?? undefined,
	assetId: r.asset_key ?? undefined,
	area: r.area ?? undefined,
	updatedAt: r.updated_at
});

export const listPosters = async () =>
	(await q<PosterRow>('select id, name, kind, preset_id, asset_key, area, updated_at from poster_templates order by position, updated_at')).map(
		rowToTemplate
	);
