import { HttpError } from './api';
import { q } from './db';

export function normalizeUsername(raw: string) {
	const name = (raw ?? '').normalize('NFKC').trim();
	const len = [...name].length;
	if (len < 3 || len > 30) throw new HttpError(400, 'Username harus 3–30 karakter.');
	return name;
}

export function checkPassword(p: string) {
	if (!p || p.length < 8 || p.length > 128) throw new HttpError(400, 'Password minimal 8 karakter.');
}

/** Karya tamu di perangkat ini ikut pindah ke akun (PRD FR-ACC-04). */
export async function claimDevice(deviceId: string, userId: string) {
	const rows = await q('update projects set owner_user_id = $1 where owner_device_id = $2 and owner_user_id is null returning id', [
		userId,
		deviceId
	]);
	await q('update devices set claimed_by = $1, claimed_at = now() where id = $2', [userId, deviceId]).catch(() => {});
	return rows.length;
}
