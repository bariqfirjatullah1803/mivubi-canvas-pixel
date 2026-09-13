import { handler, int } from '$lib/server/api';
import { publicRows, toPublic } from '$lib/server/projects';

export const GET = handler(async (event) => {
	const limitParam = event.url.searchParams.get('limit');
	const limit = limitParam ? Math.max(1, Math.min(500, int(limitParam, 6))) : undefined;
	return (await publicRows(limit)).map(toPublic);
});
