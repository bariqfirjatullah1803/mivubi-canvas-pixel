import type { RequestEvent } from '@sveltejs/kit';
import { ensureDevice } from './auth';

/** Pemilik permintaan: akun kalau sudah masuk, kalau tidak perangkat (dibuat kalau perlu). */
export async function principal(event: RequestEvent) {
	return { userId: event.locals.userId, deviceId: await ensureDevice(event.cookies) };
}
