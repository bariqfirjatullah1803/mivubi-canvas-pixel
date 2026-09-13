// Identitas dipasang sekali per permintaan; endpoint tinggal membaca locals.
import type { Handle } from '@sveltejs/kit';
import { isAdmin, userFromCookies } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const isApi = event.url.pathname.startsWith('/api/');
	if (isApi) {
		event.locals.userId = await userFromCookies(event.cookies).catch(() => null);
		event.locals.admin = await isAdmin(event.cookies).catch(() => false);
	}
	return resolve(event);
};
