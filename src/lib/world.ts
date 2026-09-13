// Geometri penempatan Canvas World (PRD §13.2–13.3). Murni, dipakai klien dan server.
export type Placement = { x: number; y: number; w: number; h: number; gap: number };

export function hash32(s: string) {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return h >>> 0;
}

/** Titik-titik kandidat berbentuk spiral Fibonacci dari pusat, diacak per karya. */
export function candidates(w: number, h: number, gap: number, seed: string, limit = 8192) {
	const out: [number, number][] = [];
	const seen = new Set<string>();
	const phase = (hash32(seed) / 2 ** 32) * 2 * Math.PI;
	const step = Math.PI * (3 - Math.sqrt(5));
	const stride = Math.max(1, Math.sqrt((w + gap) * (h + gap)) / 3);
	const aspect = Math.sqrt(1.25);
	for (let s = 0; s < limit * 4 && out.length < limit; s++) {
		const r = Math.sqrt(s) * stride,
			t = phase + s * step;
		const x = Math.round(Math.cos(t) * r * aspect) - Math.floor(w / 2);
		const y = Math.round((Math.sin(t) * r) / aspect) - Math.floor(h / 2);
		const k = `${x},${y}`;
		if (!seen.has(k)) {
			seen.add(k);
			out.push([x, y]);
		}
	}
	return out;
}

export const collides = (a: Placement, b: Placement) => {
	const g = Math.max(a.gap, b.gap);
	return a.x < b.x + b.w + g && b.x < a.x + a.w + g && a.y < b.y + b.h + g && b.y < a.y + a.h + g;
};
