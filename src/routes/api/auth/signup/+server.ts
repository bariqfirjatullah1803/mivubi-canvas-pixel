import { HttpError, body, handler } from '$lib/server/api';
import { ensureDevice, hashPassword, setUserSession } from '$lib/server/auth';
import { one } from '$lib/server/db';
import { checkPassword, claimDevice, normalizeUsername } from '$lib/server/accounts';

export const POST = handler(async (event) => {
	const { username, password } = await body<{ username: string; password: string }>(event);
	const name = normalizeUsername(username);
	checkPassword(password);
	const taken = await one('select id from users where lower(username) = lower($1)', [name]);
	if (taken) throw new HttpError(409, 'Username itu sudah dipakai. Coba yang lain.');
	const user = await one<{ id: string; username: string }>('insert into users (username, pass_hash) values ($1, $2) returning id, username', [
		name,
		await hashPassword(password)
	]);
	const deviceId = await ensureDevice(event.cookies);
	const claimed = await claimDevice(deviceId, user!.id);
	await setUserSession(event.cookies, user!.id);
	return { user, claimed };
});
