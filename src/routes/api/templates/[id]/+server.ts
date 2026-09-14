import { one } from '$lib/server/db';
import { handler, requireAdmin } from '$lib/server/api';
import { deleteTemplateArtwork } from '$lib/server/templates';

export const DELETE = handler(async (event) => {
	requireAdmin(event);
	const row = await one<{ project_id: string | null }>('delete from templates where id = $1 returning project_id', [event.params.id]);
	await deleteTemplateArtwork(row?.project_id ?? null);
	return { ok: true };
});
