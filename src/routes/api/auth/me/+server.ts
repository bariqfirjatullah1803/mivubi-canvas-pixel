import { handler } from '$lib/server/api';
import { one } from '$lib/server/db';

export const GET = handler(async (event) => {
	if (!event.locals.userId) return { user: null };
	const user = await one<{ id: string; username: string }>('select id, username from users where id = $1', [event.locals.userId]);
	return { user: user ?? null };
});
