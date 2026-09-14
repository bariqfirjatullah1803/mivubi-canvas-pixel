// Model grid, template, dan geometri (PRD §6, §11.1, §13).

export const EMPTY = 0xffff;

export type PaletteColor = { id: string; slot: number; hex: string; name?: string; locked: true };
export type SiteColor = { id: string; hex: string; name?: string };
export type CanvasSettings = { widthMm: number; heightMm: number; cellMm: number };

export type Project = {
	schemaVersion: 4;
	id: string;
	name: string;
	widthMm: number;
	heightMm: number;
	cellMm: number;
	columns: number;
	rows: number;
	palette: PaletteColor[];
	cells: Uint16Array;
	createdAt: string;
	updatedAt: string;
};

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export const DEFAULT_CANVAS: CanvasSettings = { widthMm: 2400, heightMm: 1200, cellMm: 50 };

// PRD Lampiran E
export const DEFAULT_PALETTE: SiteColor[] = [
	{ id: 'default-near-black', name: 'Hitam gelap', hex: '#101418' },
	{ id: 'default-dark-gray', name: 'Abu-abu gelap', hex: '#343B40' },
	{ id: 'default-mid-gray', name: 'Abu-abu sedang', hex: '#737C80' },
	{ id: 'default-bone-white', name: 'Putih tulang', hex: '#E8ECE8' },
	{ id: 'default-cyan', name: 'Biru cyan', hex: '#2AA6B4' },
	{ id: 'default-green', name: 'Hijau', hex: '#397A20' },
	{ id: 'default-brown', name: 'Cokelat', hex: '#744126' },
	{ id: 'default-tan', name: 'Kuning-tan', hex: '#B78850' }
];

export function gridOf(c: CanvasSettings) {
	return { columns: Math.round(c.widthMm / c.cellMm), rows: Math.round(c.heightMm / c.cellMm) };
}

/** Alasan Canvas tidak valid, atau null (PRD §6.1). */
export function canvasError(c: CanvasSettings): string | null {
	const { widthMm: w, heightMm: h, cellMm: s } = c;
	if (![w, h, s].every((v) => Number.isFinite(v) && v > 0)) return 'Isi lebar, tinggi, dan ukuran sel dengan angka positif.';
	if (w > 1_000_000 || h > 1_000_000) return 'Ukuran fisik maksimal 1.000.000 mm.';
	if (Math.abs(w / s - Math.round(w / s)) > 1e-9 || Math.abs(h / s - Math.round(h / s)) > 1e-9)
		return 'Lebar dan tinggi harus habis dibagi ukuran sel.';
	const { columns, rows } = gridOf(c);
	if (columns > 2000 || rows > 2000) return 'Maksimal 2.000 sel per sisi.';
	if (columns * rows > 250_000) return 'Maksimal 250.000 sel total.';
	return null;
}

export function lockPalette(colors: SiteColor[]): PaletteColor[] {
	return colors.map((c, slot) => ({ id: c.id, slot, hex: c.hex, name: c.name, locked: true }));
}

export function createProject(canvas: CanvasSettings, colors: SiteColor[], name = 'Canvas Pixel'): Project {
	const { columns, rows } = gridOf(canvas);
	const now = new Date().toISOString();
	return {
		schemaVersion: 4,
		id: crypto.randomUUID(),
		name,
		...canvas,
		columns,
		rows,
		palette: lockPalette(colors),
		cells: new Uint16Array(columns * rows).fill(EMPTY),
		createdAt: now,
		updatedAt: now
	};
}

export function cloneProject(p: Project): Project {
	return { ...p, palette: p.palette.map((c) => ({ ...c })), cells: new Uint16Array(p.cells) };
}

export function filledCount(cells: Uint16Array) {
	let n = 0;
	for (const c of cells) if (c !== EMPTY) n++;
	return n;
}

export function contentBounds(p: Pick<Project, 'cells' | 'columns' | 'rows'>): Bounds | null {
	let minX = Infinity,
		minY = Infinity,
		maxX = -1,
		maxY = -1;
	for (let y = 0; y < p.rows; y++)
		for (let x = 0; x < p.columns; x++)
			if (p.cells[y * p.columns + x] !== EMPTY) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
	return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

/** Garis Bresenham antar sel agar goresan tidak melompat (PRD F3). */
export function linePoints(x0: number, y0: number, x1: number, y1: number): [number, number][] {
	const pts: [number, number][] = [];
	const dx = Math.abs(x1 - x0),
		dy = -Math.abs(y1 - y0);
	const sx = x0 < x1 ? 1 : -1,
		sy = y0 < y1 ? 1 : -1;
	let err = dx + dy;
	for (;;) {
		pts.push([x0, y0]);
		if (x0 === x1 && y0 === y1) return pts;
		const e2 = 2 * err;
		if (e2 >= dy) {
			err += dy;
			x0 += sx;
		}
		if (e2 <= dx) {
			err += dx;
			y0 += sy;
		}
	}
}

export function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export function contrast(a: string, b: string) {
	const lum = (hex: string) => {
		const [r, g, bl] = hexToRgb(hex).map((v) => {
			const c = v / 255;
			return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
	};
	const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
	return (x + 0.05) / (y + 0.05);
}

export function nearestSlot(hex: string, palette: PaletteColor[]): number {
	const [r, g, b] = hexToRgb(hex);
	let best = 0,
		bestD = Infinity;
	palette.forEach((c, i) => {
		const [cr, cg, cb] = hexToRgb(c.hex);
		const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	});
	return best;
}

// PRD Lampiran A
export type Template = { id: string; name: string; colors: Record<string, string>; rows: string[]; projectId?: string | null };
const rep = (s: string, n: number) => Array(n).fill(s);
export const TEMPLATES: Template[] = [
	{
		id: 'tree',
		name: 'Pohon',
		colors: { g: '#548B35', b: '#80502E', y: '#DCA83B' },
		rows: ['....g....', '...ggg...', '..ggggg..', '.ggggggg.', '....b....', '....b....', '..bbbbb..', 'yyyyyyyyy']
	},
	{
		id: 'smile',
		name: 'Smiley',
		colors: { y: '#EBB734', k: '#25332B' },
		rows: ['..yyyyy..', '.yyyyyyy.', 'yyyyyyyyy', 'yykyyykyy', 'yyyyyyyyy', 'ykyyyyyky', 'yykkkkkyy', '.yyyyyyy.', '..yyyyy..']
	},
	{
		id: 'heart',
		name: 'Hati',
		colors: { r: '#D84955' },
		rows: ['.rr...rr.', 'rrrr.rrrr', 'rrrrrrrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....']
	},
	{
		id: 'star',
		name: 'Bintang',
		colors: { y: '#EBB734' },
		rows: ['....y....', '....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '.yyy.yyy.', '.yy...yy.']
	},
	{
		id: 'house',
		name: 'Rumah',
		colors: { r: '#B4533C', y: '#E9C985', b: '#684731', c: '#56B8C5' },
		rows: ['....r....', '...rrr...', '..rrrrr..', '.rrrrrrr.', 'rrrrrrrrr', '.yyyyyyy.', '.yccybby.', '.yccybby.', '.yyyybby.']
	},
	{
		id: 'flag',
		name: 'Merah Putih',
		colors: { r: '#CE343A', w: '#FFFDF3', b: '#684731' },
		rows: [...rep('brrrrrrrr', 3), ...rep('bwwwwwwww', 3), ...rep('b........', 3)]
	}
];

export const templateSize = (t: Template) => ({ w: t.rows[0]?.length ?? 0, h: t.rows.length });

export const MAX_TEMPLATE = 64;

/** Alasan referensi tidak valid, atau null. */
export function templateError(t: Template): string | null {
	if (!t.name.trim()) return 'Nama referensi belum diisi.';
	const { w, h } = templateSize(t);
	if (!h || h > MAX_TEMPLATE) return `Tinggi pola harus 1–${MAX_TEMPLATE} baris.`;
	if (!w || w > MAX_TEMPLATE) return `Lebar pola harus 1–${MAX_TEMPLATE} sel.`;
	if (t.rows.some((r) => r.length !== w)) return 'Semua baris pola harus sama panjang.';
	const used = new Set([...t.rows.join('')].filter((c) => c !== '.'));
	if (!used.size) return 'Pola masih kosong.';
	for (const c of used) if (!/^#[0-9A-Fa-f]{6}$/.test(t.colors[c] ?? '')) return `Simbol "${c}" belum punya warna.`;
	return null;
}

/** Satu simbol per warna di dalam pola. Urutannya juga dipakai editor Admin: simbol ke-n = slot palet ke-n. */
export const SYMBOLS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Karya → referensi: dipotong sebatas isinya, warna disimpan sebagai HEX bukan slot,
    supaya pola tetap benar kalau palet situs berubah. */
export function templateFromProject(p: Project, name: string): Template | null {
	const b = contentBounds(p);
	if (!b) return null;
	const sym = new Map<number, string>();
	const colors: Record<string, string> = {};
	const rows: string[] = [];
	for (let y = b.minY; y <= b.maxY; y++) {
		let line = '';
		for (let x = b.minX; x <= b.maxX; x++) {
			const v = p.cells[y * p.columns + x];
			const hex = v === EMPTY ? null : p.palette[v]?.hex;
			if (!hex) {
				line += '.';
				continue;
			}
			let ch = sym.get(v);
			if (!ch) {
				ch = SYMBOLS[sym.size];
				if (!ch) return null; // lebih dari 62 warna: di luar jangkauan palet situs
				sym.set(v, ch);
				colors[ch] = hex;
			}
			line += ch;
		}
		rows.push(line);
	}
	return { id: crypto.randomUUID(), name: name.trim().slice(0, 80), colors, rows };
}

export type CellDiff = { idx: number[]; before: number[]; after: number[] };

/** PRD §13.6: pusatkan, skala tanpa interpolasi, slot palet terdekat.
    Hasilnya berupa daftar sel yang berubah, jadi menempel referensi bisa diurungkan
    seperti satu goresan biasa. Mode 'replace' ikut mengosongkan sisa papan. */
export function templateDiff(p: Project, tpl: Template, mode: 'replace' | 'over' = 'replace'): CellDiff {
	const { w: tw, h: th } = templateSize(tpl);
	const d: CellDiff = { idx: [], before: [], after: [] };
	if (!tw || !th) return d;
	const available = Math.min(p.columns / tw, p.rows / th);
	const scale = available >= 1 ? Math.max(1, Math.floor(available * 0.7)) : available;
	const ow = Math.max(1, Math.round(tw * scale)),
		oh = Math.max(1, Math.round(th * scale));
	const ox = Math.floor((p.columns - ow) / 2),
		oy = Math.floor((p.rows - oh) / 2);
	const slots: Record<string, number> = {};
	for (const [k, hex] of Object.entries(tpl.colors)) slots[k] = nearestSlot(hex, p.palette);
	const next = new Map<number, number>();
	if (mode === 'replace') for (let i = 0; i < p.cells.length; i++) if (p.cells[i] !== EMPTY) next.set(i, EMPTY);
	if (p.palette.length)
		for (let y = 0; y < oh; y++)
			for (let x = 0; x < ow; x++) {
				const ch = tpl.rows[Math.min(th - 1, Math.floor(y / scale))][Math.min(tw - 1, Math.floor(x / scale))];
				if (ch !== '.') next.set((oy + y) * p.columns + ox + x, slots[ch] ?? 0);
			}
	for (const [i, v] of next)
		if (p.cells[i] !== v) {
			d.idx.push(i);
			d.before.push(p.cells[i]);
			d.after.push(v);
		}
	return d;
}

export function applyTemplate(p: Project, tpl: Template): Project {
	const out = cloneProject(p);
	const d = templateDiff(p, tpl, 'replace');
	d.idx.forEach((i, k) => (out.cells[i] = d.after[k]));
	out.name = tpl.name;
	return out;
}
