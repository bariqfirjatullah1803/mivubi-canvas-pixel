import { HttpError, body, handler } from '$lib/server/api';
import { clearAdminSession, setAdminSession, verifyPassword } from '$lib/server/auth';
import { need } from '$lib/server/env';

export const GET = handler(async (event) => ({ admin: event.locals.admin }));

export const POST = handler(async (event) => {
	const { password } = await body<{ password: string }>(event);
	// ponytail: tanpa rate limit. Tambah bucket per IP (tabel rate_limit_buckets) sebelum publik.
	if (!(await verifyPassword(password ?? '', need('ADMIN_PASSWORD_HASH')))) throw new HttpError(401, 'Password Admin tidak sesuai.');
	await setAdminSession(event.cookies);
	return { admin: true };
});

export const DELETE = handler(async (event) => {
	clearAdminSession(event.cookies);
	return { admin: false };
});
