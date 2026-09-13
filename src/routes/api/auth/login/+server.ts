import { HttpError, body, handler } from '$lib/server/api';
import { ensureDevice, setUserSession, verifyPassword } from '$lib/server/auth';
import { one } from '$lib/server/db';
import { claimDevice } from '$lib/server/accounts';

export const POST = handler(async (event) => {
	const { username, password } = await body<{ username: string; password: string }>(event);
	const row = await one<{ id: string; username: string; pass_hash: string }>(
		'select id, username, pass_hash from users where lower(username) = lower($1)',
		[(username ?? '').normalize('NFKC').trim()]
	);
	const okPass = row ? await verifyPassword(password ?? '', row.pass_hash) : false;
	if (!row || !okPass) throw new HttpError(401, 'Username atau password tidak sesuai.');
	const deviceId = await ensureDevice(event.cookies);
	const claimed = await claimDevice(deviceId, row.id);
	await setUserSession(event.cookies, row.id);
	return { user: { id: row.id, username: row.username }, claimed };
});
