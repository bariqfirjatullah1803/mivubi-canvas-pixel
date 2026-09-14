// Alat bantu endpoint: bentuk galat seragam, penjaga akses, dan pembaca body.
import { json, type RequestEvent } from '@sveltejs/kit';

export class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
		public detail: Record<string, unknown> = {}
	) {
		super(message);
	}
}

export const ok = <T>(data: T, init?: ResponseInit) => json(data, init);

/** Bungkus handler: HttpError jadi respons rapi, galat lain jadi 500 tanpa bocor detail. */
export function handler<T>(fn: (e: RequestEvent) => Promise<T>) {
	return async (event: RequestEvent) => {
		try {
			return json((await fn(event)) ?? {});
		} catch (e) {
			if (e instanceof HttpError) return json({ message: e.message, detail: e.detail }, { status: e.status });
			console.error(`[api] ${event.request.method} ${event.url.pathname}`, e);
			return json({ message: 'Terjadi kesalahan di server.' }, { status: 500 });
		}
	};
}

export function requireAdmin(event: RequestEvent) {
	if (!event.locals.admin) throw new HttpError(401, 'Sesi admin diperlukan.');
}

export async function body<T>(event: RequestEvent): Promise<T> {
	try {
		return (await event.request.json()) as T;
	} catch {
		throw new HttpError(400, 'Body bukan JSON yang sah.');
	}
}

export const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const int = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : fallback);
