// Identitas dipasang sekali per permintaan; endpoint tinggal membaca locals.
import type { Handle, ServerInit } from '@sveltejs/kit';
import { isAdmin, userFromCookies } from '$lib/server/auth';
import { backfillTemplateArtworks } from '$lib/server/templates';

// Referensi yang belum punya karya di Canvas World dibuatkan sekali saat server menyala.
// Gagal di sini tidak boleh menjatuhkan server: World hanya tampil tanpa referensi.
export const init: ServerInit = async () => {
	try {
		const n = await backfillTemplateArtworks();
		if (n) console.log(`[init] ${n} referensi dipajang di Canvas World`);
	} catch (e) {
		console.error('[init] referensi belum dapat dipajang:', (e as Error).message);
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	const isApi = event.url.pathname.startsWith('/api/');
	if (isApi) {
		event.locals.userId = await userFromCookies(event.cookies).catch(() => null);
		event.locals.admin = await isAdmin(event.cookies).catch(() => false);
	}
	return resolve(event);
};
