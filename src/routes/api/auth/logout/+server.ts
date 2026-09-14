import { handler } from '$lib/server/api';
import { COOKIE, clearUserSession } from '$lib/server/auth';

export const POST = handler(async (event) => {
	clearUserSession(event.cookies);
	// PRD FR-DEV-06: tamu berikutnya di perangkat ini tidak mewarisi karya akun yang baru keluar.
	event.cookies.delete(COOKIE.device, { path: '/' });
	return { ok: true };
});
