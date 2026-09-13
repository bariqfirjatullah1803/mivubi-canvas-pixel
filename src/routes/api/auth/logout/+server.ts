import { handler } from '$lib/server/api';
import { clearUserSession } from '$lib/server/auth';

export const POST = handler(async (event) => {
	clearUserSession(event.cookies);
	return { ok: true };
});
