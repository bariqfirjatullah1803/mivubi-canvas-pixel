import { q } from '$lib/server/db';
import { handler, requireAdmin } from '$lib/server/api';

export const DELETE = handler(async (event) => {
	requireAdmin(event);
	await q('delete from templates where id = $1', [event.params.id]);
	return { ok: true };
});
