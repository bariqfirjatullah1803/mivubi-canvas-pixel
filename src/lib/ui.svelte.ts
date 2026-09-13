// Toast global, sesi akun, dan tema (DESIGN §8.5, PRD FR-PROF-04).
import { me, type UserInfo } from './store';

export const auth = $state({ user: null as UserInfo | null, ready: false });

export async function refreshAuth() {
	try {
		auth.user = await me();
	} catch {
		/* cek akun gagal tidak menghalangi tamu (PRD F1) */
	}
	auth.ready = true;
}

export const toasts: { id: number; text: string }[] = $state([]);
let seq = 0;

export function toast(text: string) {
	const id = ++seq;
	toasts.push({ id, text });
	setTimeout(() => {
		const i = toasts.findIndex((t) => t.id === id);
		if (i >= 0) toasts.splice(i, 1);
	}, 3800);
}

export type Theme = 'light' | 'dark';
const THEME_KEY = 'mivubi.theme';

export const theme = $state({ value: 'light' as Theme });

export function readTheme(): Theme {
	try {
		return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
	} catch {
		return 'light';
	}
}

export function applyTheme(t: Theme = readTheme()) {
	theme.value = t;
	document.documentElement.dataset.theme = t;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#10271C' : '#FFFEF5');
}

/** Ganti tema. Warna baru melebar seperti lingkaran dari titik `origin` (default: tombol tema). */
export function setTheme(t: Theme, origin?: { x: number; y: number }) {
	if (theme.value === t) return;
	theme.value = t; // ditandai lebih dulu agar klik susulan tidak membatalkan transisi
	try {
		localStorage.setItem(THEME_KEY, t);
	} catch {
		/* tetap berlaku untuk tab ini */
	}
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const start = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }).startViewTransition;
	if (reduced || !start) {
		applyTheme(t);
		return;
	}
	const box = document.querySelector('.trigger')?.getBoundingClientRect();
	const x = origin?.x ?? (box ? box.left + box.width / 2 : innerWidth);
	const y = origin?.y ?? (box ? box.top + box.height / 2 : 0);
	const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
	start.call(document, () => applyTheme(t)).ready.then(() => {
		document.documentElement.animate(
			{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
			{ duration: 550, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
		);
	});
}

/** Waktu relatif singkat: "baru saja", "3 jam lalu", "2 hari lalu", lalu tanggal. */
export function timeAgo(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const menit = Math.round(diff / 60000);
	if (menit < 1) return 'baru saja';
	if (menit < 60) return `${menit} menit lalu`;
	const jam = Math.round(menit / 60);
	if (jam < 24) return `${jam} jam lalu`;
	const hari = Math.round(jam / 24);
	if (hari === 1) return 'kemarin';
	if (hari < 30) return `${hari} hari lalu`;
	return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDate(iso: string) {
	return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
