// Renderer papan blok magnet (PRD §6.3, DESIGN §3) dan poster PNG (PRD §13.7, DESIGN §12).
import { EMPTY, contrast, type Bounds, type Project } from './grid';

export const IVORY = '#FBFAF4';
const paleCache = new Map<string, boolean>();
const isPale = (hex: string) => {
	if (!paleCache.has(hex)) paleCache.set(hex, contrast(hex, IVORY) < 1.5);
	return paleCache.get(hex)!;
};

export function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, hex: string, dpr = 1) {
	ctx.fillStyle = hex;
	ctx.fillRect(x, y, s, s);
	if (s >= 8) {
		const g = ctx.createLinearGradient(0, y, 0, y + s);
		g.addColorStop(0, 'rgba(255,255,255,0.22)');
		g.addColorStop(0.5, 'rgba(255,255,255,0)');
		g.addColorStop(1, 'rgba(0,0,0,0.18)');
		ctx.fillStyle = g;
		ctx.fillRect(x, y, s, s);
	}
	// DESIGN §3.1: warna pucat selalu mendapat sambungan agar tidak hilang di ivory.
	if (s >= 8 || isPale(hex)) {
		const px = 1 / dpr;
		ctx.fillStyle = 'rgba(255,255,255,0.35)';
		ctx.fillRect(x, y, s, px);
		ctx.fillRect(x, y, px, s);
		ctx.fillStyle = 'rgba(0,0,0,0.3)';
		ctx.fillRect(x, y + s - px, s, px);
		ctx.fillRect(x + s - px, y, px, s);
	}
}

/** Bingkai hitam papan dengan permukaan ivory. (x, y) = pojok area grid. */
export function drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
	const r = Math.min(20, frame * 1.2);
	const g = ctx.createLinearGradient(0, y - frame, 0, y + h + frame);
	g.addColorStop(0, '#2f3533');
	g.addColorStop(1, '#0c0f0e');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.roundRect(x - frame, y - frame, w + frame * 2, h + frame * 2, r);
	ctx.fill();
	ctx.strokeStyle = 'rgba(255,255,255,0.12)';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.roundRect(x - frame + 1.5, y - frame + 1.5, w + frame * 2 - 3, h + frame * 2 - 3, Math.max(0, r - 1.5));
	ctx.stroke();
	ctx.fillStyle = IVORY;
	ctx.fillRect(x, y, w, h);
}

export function drawCells(
	ctx: CanvasRenderingContext2D,
	p: Pick<Project, 'cells' | 'columns' | 'rows' | 'palette'>,
	x: number,
	y: number,
	cell: number,
	dpr = 1,
	b?: Bounds
) {
	const x0 = b?.minX ?? 0,
		y0 = b?.minY ?? 0,
		x1 = b?.maxX ?? p.columns - 1,
		y1 = b?.maxY ?? p.rows - 1;
	for (let cy = y0; cy <= y1; cy++)
		for (let cx = x0; cx <= x1; cx++) {
			const v = p.cells[cy * p.columns + cx];
			if (v !== EMPTY && p.palette[v]) drawBlock(ctx, x + (cx - x0) * cell, y + (cy - y0) * cell, cell, p.palette[v].hex, dpr);
		}
}

export function drawGridLines(ctx: CanvasRenderingContext2D, x: number, y: number, cols: number, rows: number, cell: number, dpr: number) {
	if (cell < 3) return;
	ctx.fillStyle = 'rgba(21,61,43,0.13)';
	const px = 1 / dpr;
	for (let i = 1; i < cols; i++) ctx.fillRect(Math.round((x + i * cell) * dpr) / dpr, y, px, rows * cell);
	for (let j = 1; j < rows; j++) ctx.fillRect(x, Math.round((y + j * cell) * dpr) / dpr, cols * cell, px);
}

/** Siapkan canvas sesuai DPR (maks 2) dan kembalikan konteks bersih. */
export function fitCanvas(canvas: HTMLCanvasElement, w: number, h: number) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	const pw = Math.max(1, Math.min(16000, Math.round(w * dpr))),
		ph = Math.max(1, Math.min(16000, Math.round(h * dpr)));
	if (canvas.width !== pw) canvas.width = pw;
	if (canvas.height !== ph) canvas.height = ph;
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, w, h);
	ctx.imageSmoothingEnabled = false;
	return { ctx, dpr };
}

// ---------- poster ----------
export type PosterPreset = {
	id: string;
	name: string;
	label: string;
	background: string;
	frame: string;
	artSurface: string;
	accent: string;
	text: string;
	mutedText: string;
	texture?: boolean;
};

export const POSTER_PRESETS: PosterPreset[] = [
	{
		id: 'default',
		name: 'MIVUBI',
		label: 'MIVUBI',
		background: '#D8EEFF',
		frame: '#153D2B',
		artSurface: '#FFFEF5',
		accent: '#08783F',
		text: '#153D2B',
		mutedText: '#506D5E'
	},
	{
		id: 'atb',
		name: 'Around The Block',
		label: 'AROUND THE BLOCK',
		background: '#10171C',
		frame: '#26343C',
		artSurface: '#EAF2F4',
		accent: '#2ED7E6',
		text: '#F4FAFB',
		mutedText: '#9DB0B8',
		texture: true
	}
];

export type PosterInfo = { title: string; creator: string | null; social: string | null };

// Potret 9:16, ukuran siap unggah ke story (PRD FR-EXP-01 [R10]).
export const POSTER_W = 1080;
export const POSTER_H = 1920;

export type PosterArea = { x: number; y: number; width: number; height: number };

/** Katalog template poster (PRD FR-POSTER-02): preset digambar kode, image memakai overlay PNG unggahan. */
export type PosterTemplate = {
	id: string;
	name: string;
	kind: 'preset' | 'image';
	presetId?: string;
	assetId?: string;
	area?: PosterArea;
	updatedAt: string;
};

/** Area karya di preset bawaan; juga nilai awal template gambar (PRD FR-POSTER-05, disesuaikan ke 9:16). */
export const DEFAULT_POSTER_AREA: PosterArea = { x: 104, y: 286, width: 872, height: 1206 };

export function loadImage(src: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

// Logo dimuat sekali lalu diwarnai ulang per preset (berkasnya monokrom dengan latar transparan).
let markPromise: Promise<HTMLImageElement> | null = null;
const loadMark = () => (markPromise ??= loadImage('/logo/mark.png'));
function tintMark(img: HTMLImageElement, color: string, size: number) {
	const c = document.createElement('canvas');
	c.width = c.height = size;
	const x = c.getContext('2d')!;
	x.drawImage(img, 0, 0, size, size);
	x.globalCompositeOperation = 'source-in';
	x.fillStyle = color;
	x.fillRect(0, 0, size, size);
	return c;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number) {
	if (ctx.measureText(text).width <= max) return text;
	let t = text;
	while (t && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
	return t + '…';
}

/** Karya di dalam area: proporsi dipertahankan, dipusatkan, sel bilangan bulat kalau muat. */
function paintArt(ctx: CanvasRenderingContext2D, p: Project, area: PosterArea) {
	let cell = Math.min(area.width / p.columns, area.height / p.rows);
	if (cell >= 1) cell = Math.floor(cell);
	const aw = cell * p.columns,
		ah = cell * p.rows;
	const ax = Math.round(area.x + (area.width - aw) / 2),
		ay = Math.round(area.y + (area.height - ah) / 2);
	for (let y = 0; y < p.rows; y++)
		for (let x = 0; x < p.columns; x++) {
			const v = p.cells[y * p.columns + x];
			if (v === EMPTY || !p.palette[v]) continue;
			ctx.fillStyle = p.palette[v].hex;
			ctx.fillRect(ax + x * cell, ay + y * cell, cell, cell);
		}
}

/** Template gambar (PRD FR-EXP-04): latar putih → karya di area → overlay PNG. Tanpa teks dinamis. */
export function renderImagePoster(p: Project, area: PosterArea, overlay: HTMLImageElement | null): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = POSTER_W;
	c.height = POSTER_H;
	const ctx = c.getContext('2d')!;
	ctx.imageSmoothingEnabled = false;
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0, 0, POSTER_W, POSTER_H);
	paintArt(ctx, p, area);
	if (overlay) ctx.drawImage(overlay, 0, 0, POSTER_W, POSTER_H);
	return c;
}

export const presetOf = (id: string | undefined) => POSTER_PRESETS.find((x) => x.id === id) ?? POSTER_PRESETS[0];

/** Satu pintu untuk katalog: preset digambar kode, image memakai berkas dari penyimpanan. */
export async function renderPosterTemplate(p: Project, info: PosterInfo, tpl: PosterTemplate): Promise<HTMLCanvasElement> {
	if (tpl.kind !== 'image') return renderPoster(p, info, presetOf(tpl.presetId));
	const overlay = tpl.assetId ? await loadImage(`/api/assets/${tpl.assetId}`).catch(() => null) : null;
	return renderImagePoster(p, tpl.area ?? DEFAULT_POSTER_AREA, overlay);
}

export async function renderPoster(p: Project, info: PosterInfo, preset: PosterPreset): Promise<HTMLCanvasElement> {
	const F = "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif";
	await Promise.all(['700 56px', '500 30px', '600 24px'].map((w) => document.fonts.load(`${w} 'Plus Jakarta Sans Variable'`).catch(() => null)));
	await document.fonts.ready;
	const mark = await loadMark().catch(() => null);
	const W = POSTER_W,
		H = POSTER_H;
	const c = document.createElement('canvas');
	c.width = W;
	c.height = H;
	const ctx = c.getContext('2d')!;
	ctx.imageSmoothingEnabled = false;
	ctx.fillStyle = preset.background;
	ctx.fillRect(0, 0, W, H);
	if (preset.texture) {
		ctx.strokeStyle = preset.accent;
		ctx.globalAlpha = 0.16;
		ctx.lineWidth = 2;
		for (let i = -H; i < W + H; i += 72) {
			ctx.beginPath();
			ctx.moveTo(i, H);
			ctx.lineTo(i + H, 0);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	// Kepala: logo + wordmark, label preset di kanan.
	// Diwarnai tepat pada ukuran tampilnya: kanvas poster mematikan smoothing, jadi penskalaan
	// terakhir harus 1:1 supaya logo tidak bergerigi.
	if (mark) ctx.drawImage(tintMark(mark, preset.accent, 58), 72, 84);
	ctx.fillStyle = preset.text;
	ctx.font = `700 44px ${F}`;
	ctx.fillText('MIVUBI', 144, 130);
	ctx.fillStyle = preset.mutedText;
	ctx.font = `600 24px ${F}`;
	ctx.textAlign = 'right';
	ctx.fillText(preset.label, 1008, 130);
	ctx.textAlign = 'left';

	// Bingkai papan.
	ctx.fillStyle = preset.frame;
	ctx.beginPath();
	ctx.roundRect(72, 220, 936, 1300, 40);
	ctx.fill();
	ctx.fillStyle = preset.accent;
	ctx.fillRect(104, 252, 872, 10);
	ctx.fillStyle = preset.artSurface;
	ctx.beginPath();
	ctx.roundRect(104, 286, 872, 1206, 24);
	ctx.fill();

	paintArt(ctx, p, { x: 120, y: 324, width: 840, height: 1130 });

	// Kaki: judul, byline, dan label grid.
	ctx.fillStyle = preset.text;
	ctx.font = `700 56px ${F}`;
	ctx.fillText(truncate(ctx, info.title, 700), 72, 1700);
	ctx.fillStyle = preset.mutedText;
	ctx.font = `500 30px ${F}`;
	const byline = [info.creator, info.social].filter(Boolean).join(' · ') || `${p.columns} × ${p.rows} sel`;
	ctx.fillText(truncate(ctx, byline, 700), 72, 1760);
	ctx.textAlign = 'right';
	ctx.fillStyle = preset.accent;
	ctx.font = `700 26px ${F}`;
	ctx.fillText('CANVAS PIXEL', 1008, 1700);
	ctx.fillStyle = preset.mutedText;
	ctx.font = `500 22px ${F}`;
	ctx.fillText(`${p.columns} × ${p.rows} GRID`, 1008, 1756);
	return c;
}

export const canvasBlob = (c: HTMLCanvasElement) =>
	new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG gagal dibuat'))), 'image/png'));

export function posterFileName(title: string, presetId: string) {
	const safe = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mosaic-project';
	return `${safe}-${presetId}.png`;
}
