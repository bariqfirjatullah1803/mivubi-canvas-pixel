// Karya dummy untuk mode demo: sprite simetris acak + template, deterministik (seed tetap).
import { TEMPLATES, applyTemplate, createProject, type CanvasSettings, type Project, type SiteColor } from './grid';

function mulberry32(seed: number) {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const NAMES = ['Raka', 'Sari', 'Bima', 'Nadia', 'Tio', 'Laras', 'Dimas', 'Ayu', 'Fajar', 'Wulan', 'Gilang', 'Putri', 'Reza', 'Intan', 'Yoga', 'Maya'];
const NOUNS = ['Robot', 'Monster', 'Kapal', 'Alien', 'Kumbang', 'Topeng', 'Penjaga', 'Kunang-kunang', 'Mesin', 'Tamu', 'Makhluk', 'Si kotak'];
const ADJS = ['kecil', 'ramah', 'biru', 'malam', 'pagi', 'tua', 'jenaka', 'pemalu', 'dari jauh', 'penasaran'];

export type Dummy = { project: Project; title: string; creator: string | null; social: string | null };

function sprite(p: Project, r: () => number, slots: number[]) {
	const w = [7, 9, 11, 13][Math.floor(r() * 4)];
	const h = 7 + Math.floor(r() * 7);
	const pick = () => slots[Math.floor(r() * slots.length)];
	const main = pick(),
		accent = pick(),
		detail = pick();
	const half = Math.ceil(w / 2);
	const ox = Math.floor((p.columns - w) / 2),
		oy = Math.floor((p.rows - h) / 2);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < half; x++) {
			const edge = x === 0 || y === 0 || y === h - 1;
			if (r() >= (edge ? 0.35 : 0.62)) continue;
			const c = r() < 0.7 ? main : r() < 0.7 ? accent : detail;
			p.cells[(oy + y) * p.columns + ox + x] = c;
			p.cells[(oy + y) * p.columns + ox + w - 1 - x] = c; // cermin kiri-kanan
		}
}

export function makeDummies(canvas: CanvasSettings, colors: SiteColor[], count = 60): Dummy[] {
	const r = mulberry32(20260912);
	// Tanpa warna yang terlalu pucat di papan ivory (DESIGN §3.1).
	const slots = colors.map((_, i) => i).filter((i) => !/^#(E|F)/i.test(colors[i].hex));
	const out: Dummy[] = [];
	for (let i = 0; i < count; i++) {
		let p = createProject(canvas, colors);
		let title: string;
		if (i % 4 === 3) {
			const tpl = TEMPLATES[Math.floor(r() * TEMPLATES.length)];
			p = applyTemplate(p, tpl);
			title = `${tpl.name} ${NAMES[Math.floor(r() * NAMES.length)]}`;
		} else {
			sprite(p, r, slots.length ? slots : colors.map((_, k) => k));
			title = `${NOUNS[Math.floor(r() * NOUNS.length)]} ${ADJS[Math.floor(r() * ADJS.length)]}`;
		}
		const name = NAMES[Math.floor(r() * NAMES.length)];
		out.push({
			project: p,
			title,
			creator: r() < 0.15 ? null : name,
			social: r() < 0.3 ? `@${name.toLowerCase()}` : null
		});
	}
	return out;
}
