// Pengganti server untuk UI ini: meniru kontrak API PRD §12 di localStorage.
// ponytail: satu "database" JSON di localStorage; ganti dengan fetch ke API asli saat backend siap.
import {
	DEFAULT_CANVAS,
	DEFAULT_PALETTE,
	TEMPLATES,
	applyTemplate,
	canvasError,
	contentBounds,
	createProject,
	filledCount,
	templateError,
	templateFromProject,
	type Bounds,
	type CanvasSettings,
	type Project,
	type SiteColor,
	type Template
} from './grid';
import { delAsset, putAsset } from './assets';
import { makeDummies } from './dummy';
import { DEFAULT_POSTER_AREA, POSTER_H, POSTER_PRESETS, POSTER_W, type PosterArea, type PosterTemplate } from './render';

export type Visibility = 'private' | 'public';
export type Placement = { x: number; y: number; w: number; h: number; gap: number };

type Rec = {
	id: string;
	ownerUserId: string | null;
	ownerDeviceId: string | null;
	doc: Omit<Project, 'cells'>;
	cells: number[];
	revision: number;
	visibility: Visibility;
	savedAt: string | null;
	title: string | null;
	creatorName: string | null;
	socialHandle: string | null;
	takenDownAt: string | null;
	takedownReason: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
	updatedAt: string;
	placement: Placement | null;
};
type User = { id: string; username: string; passHash: string };
export type Settings = { canvas: CanvasSettings; palette: SiteColor[]; gap: number };
type DB = {
	settings: Settings;
	templates: Template[];
	posterTemplates: PosterTemplate[];
	projects: Record<string, Rec>;
	users: Record<string, User>;
	claimedDevices: string[];
	seed?: number;
};

export type Meta = Pick<
	Rec,
	| 'revision'
	| 'visibility'
	| 'savedAt'
	| 'title'
	| 'creatorName'
	| 'socialHandle'
	| 'takenDownAt'
	| 'takedownReason'
	| 'deletedAt'
	| 'purgeAfter'
>;
export type Summary = Meta & { id: string; name: string; updatedAt: string; project: Project };
export type PublicArtwork = {
	id: string;
	title: string | null;
	creatorName: string | null;
	socialHandle: string | null;
	updatedAt: string;
	revision: number;
	project: Project;
	bounds: Bounds;
	placement: Placement | null;
};

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public detail: Record<string, unknown> = {}
	) {
		super(message);
	}
}

export const displayTitle = (t: string | null | undefined) => t?.trim() || 'Karya tanpa judul';
export const displayCreator = (c: string | null | undefined) => c?.trim() || 'Anonim';

// ---------- penyimpanan aman ----------
const mem = new Map<string, string>();
function get(k: string): string | null {
	try {
		return localStorage.getItem(k);
	} catch {
		return mem.get(k) ?? null;
	}
}
function set(k: string, v: string): boolean {
	try {
		localStorage.setItem(k, v);
		return true;
	} catch {
		mem.set(k, v);
		return false;
	}
}
function del(k: string) {
	try {
		localStorage.removeItem(k);
	} catch {
		mem.delete(k);
	}
}

// ---------- identitas perangkat (PRD FR-DEV-01) ----------
export type Device = { id: string; secret: string; displayName: string };
const DEVICE_KEY = 'mivubi-cloud-device-v1';
const SEQ_KEY = 'mivubi-device-sequence-v1';
let cachedDevice: Device | null = null;

export function device(): Device {
	if (cachedDevice) return cachedDevice;
	try {
		const d = JSON.parse(get(DEVICE_KEY) ?? '');
		if (/^[0-9a-f-]{36}$/.test(d.id) && /^[0-9a-f]{64}$/.test(d.secret)) return (cachedDevice = d);
	} catch {
		/* identitas rusak diganti baru (FR-DEV-02) */
	}
	return rotateDevice();
}

export function rotateDevice(): Device {
	const n = Number(get(SEQ_KEY) ?? 0) + 1;
	set(SEQ_KEY, String(n));
	const secret = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
	cachedDevice = { id: crypto.randomUUID(), secret, displayName: `User-${String(n).padStart(2, '0')}` };
	set(DEVICE_KEY, JSON.stringify(cachedDevice));
	return cachedDevice;
}

// ---------- database ----------
const DB_KEY = 'mivubi-demo-db-v1';
const SESSION_KEY = 'mivubi-demo-session';
const ADMIN_KEY = 'mivubi-demo-admin';

// Preset bawaan jadi isi awal katalog, supaya Admin punya dua template sejak hari pertama.
const seedPosters = (): PosterTemplate[] =>
	POSTER_PRESETS.map((p) => ({ id: p.id, name: p.name, kind: 'preset' as const, presetId: p.id, updatedAt: new Date().toISOString() }));

function freshDb(): DB {
	const db: DB = {
		settings: { canvas: { ...DEFAULT_CANVAS }, palette: DEFAULT_PALETTE.map((c) => ({ ...c })), gap: 4 },
		templates: structuredClone(TEMPLATES),
		posterTemplates: seedPosters(),
		projects: {},
		users: {},
		claimedDevices: []
	};
	// Karya contoh agar Hero dan World tidak kosong di mode demo.
	const now = Date.now();
	TEMPLATES.forEach((tpl, i) => {
		const p = applyTemplate(createProject(db.settings.canvas, db.settings.palette), tpl);
		const at = new Date(now - (TEMPLATES.length - i) * 600_000).toISOString();
		const rec = newRec(p, { userId: null, deviceId: 'demo-seed' });
		Object.assign(rec, { savedAt: at, updatedAt: at, visibility: 'public', title: tpl.name, creatorName: 'Contoh MIVUBI' });
		db.projects[rec.id] = rec;
		place(db, rec);
	});
	seedDummies(db);
	return db;
}

// Seed v2: 60 karya dummy untuk papan komunitas dan Canvas World.
function seedDummies(db: DB) {
	const now = Date.now();
	makeDummies(db.settings.canvas, db.settings.palette).forEach((d, i) => {
		const at = new Date(now - 3_600_000 - (i + 1) * 37 * 60_000).toISOString();
		const rec = newRec(d.project, { userId: null, deviceId: 'demo-seed' });
		Object.assign(rec, {
			savedAt: at,
			updatedAt: at,
			visibility: 'public',
			title: d.title,
			creatorName: d.creator,
			socialHandle: d.social
		});
		db.projects[rec.id] = rec;
		place(db, rec);
	});
	db.seed = 2;
}

function load(): DB {
	const raw = get(DB_KEY);
	if (raw)
		try {
			const db = JSON.parse(raw) as DB;
			db.templates ??= structuredClone(TEMPLATES); // database sebelum fitur referensi
			db.posterTemplates ??= seedPosters(); // database sebelum katalog poster
			if ((db.seed ?? 1) < 2) {
				seedDummies(db); // database lama tetap utuh, dummy hanya ditambahkan
				set(DB_KEY, JSON.stringify(db));
			}
			return db;
		} catch {
			/* database demo rusak: mulai ulang */
		}
	const db = freshDb();
	set(DB_KEY, JSON.stringify(db));
	return db;
}

const wait = (ms = 180) => new Promise((r) => setTimeout(r, ms));

async function call<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
	await wait();
	if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ApiError(0, 'Tidak dapat terhubung ke server.');
	const db = load();
	const out = await fn(db);
	set(DB_KEY, JSON.stringify(db));
	return out;
}

type Principal = { userId: string | null; deviceId: string | null };
function principal(db: DB): Principal {
	const uid = get(SESSION_KEY);
	if (uid && Object.values(db.users).some((u) => u.id === uid)) return { userId: uid, deviceId: null };
	return { userId: null, deviceId: device().id };
}
const owns = (r: Rec, p: Principal) => (p.userId ? r.ownerUserId === p.userId : r.ownerDeviceId === p.deviceId);

function newRec(p: Project, pr: Principal): Rec {
	const { cells, ...doc } = p;
	return {
		id: p.id,
		ownerUserId: pr.userId,
		ownerDeviceId: pr.userId ? null : pr.deviceId,
		doc,
		cells: Array.from(cells),
		revision: 1,
		visibility: 'private',
		savedAt: null,
		title: null,
		creatorName: null,
		socialHandle: null,
		takenDownAt: null,
		takedownReason: null,
		deletedAt: null,
		purgeAfter: null,
		updatedAt: p.updatedAt,
		placement: null
	};
}

const toProject = (r: Rec): Project => ({ ...r.doc, cells: Uint16Array.from(r.cells) });
function meta(r: Rec): Meta {
	const { revision, visibility, savedAt, title, creatorName, socialHandle, takenDownAt, takedownReason, deletedAt, purgeAfter } = r;
	return { revision, visibility, savedAt, title, creatorName, socialHandle, takenDownAt, takedownReason, deletedAt, purgeAfter };
}
const cellsOf = (r: Rec) => ({ cells: Uint16Array.from(r.cells), columns: r.doc.columns, rows: r.doc.rows });
const eligible = (r: Rec) =>
	!!r.savedAt && r.visibility === 'public' && !r.deletedAt && !r.takenDownAt && r.cells.some((c) => c !== 0xffff);

// ---------- penempatan World (PRD §13.2–13.3) ----------
function hash32(s: string) {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return h >>> 0;
}

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

const collides = (a: Placement, b: Placement) => {
	const g = Math.max(a.gap, b.gap);
	return a.x < b.x + b.w + g && b.x < a.x + a.w + g && a.y < b.y + b.h + g && b.y < a.y + a.h + g;
};

function place(db: DB, r: Rec) {
	const b = eligible(r) ? contentBounds(cellsOf(r)) : null;
	if (!b) {
		r.placement = null;
		return;
	}
	const w = b.maxX - b.minX + 1,
		h = b.maxY - b.minY + 1;
	const others = Object.values(db.projects)
		.filter((o) => o.id !== r.id && o.placement)
		.map((o) => o.placement!);
	const fits = (c: Placement) => !others.some((o) => collides(c, o));
	if (r.placement) {
		const keep = { ...r.placement, w, h };
		if (fits(keep)) return void (r.placement = keep);
	}
	const gap = db.settings.gap;
	for (const [x, y] of candidates(w, h, gap, `${r.savedAt}:${r.id}`)) {
		const c = { x, y, w, h, gap };
		if (fits(c)) return void (r.placement = c);
	}
	// PRD T4: pesan jelas saat World penuh, bukan galat 500 generik.
	throw new ApiError(503, 'Canvas World sedang penuh di sekitar pusat. Coba lagi nanti.');
}

// ---------- pengaturan ----------
export const getSettings = () => call((db) => structuredClone(db.settings));

export function saveCanvasSettings(widthCm: number, heightCm: number, cellCm: number) {
	return call((db) => {
		const c = { widthMm: Math.round(widthCm * 10), heightMm: Math.round(heightCm * 10), cellMm: Math.round(cellCm * 10) };
		const err = canvasError(c);
		if (err) throw new ApiError(400, err);
		db.settings.canvas = c;
	});
}

export function parsePaletteText(text: string): SiteColor[] {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
	if (lines.length < 1 || lines.length > 32) throw new ApiError(400, 'Palet harus berisi 1–32 warna.');
	const seen = new Set<string>();
	return lines.map((line, i) => {
		const [rawHex, ...rest] = line.split('|');
		let hex = rawHex.trim().replace('#', '').toUpperCase();
		if (/^[0-9A-F]{3}$/.test(hex)) hex = [...hex].map((c) => c + c).join('');
		if (!/^[0-9A-F]{6}$/.test(hex)) throw new ApiError(400, `Baris ${i + 1}: HEX "${rawHex.trim()}" tidak valid.`);
		if (seen.has(hex)) throw new ApiError(400, `Baris ${i + 1}: warna #${hex} sudah ada di palet.`);
		seen.add(hex);
		const name = rest.join('|').trim().slice(0, 80) || undefined;
		return { id: `site-${i + 1}-${hex.toLowerCase()}`, hex: `#${hex}`, name };
	});
}

export const savePalette = (text: string) =>
	call((db) => {
		db.settings.palette = parsePaletteText(text);
	});

export const saveGap = (gap: number) =>
	call((db) => {
		if (!Number.isInteger(gap) || gap < 0 || gap > 256) throw new ApiError(400, 'Gap World harus bilangan bulat 0–256.');
		db.settings.gap = gap;
	});

// ---------- referensi pola (PRD Lampiran A, dikelola Admin) ----------
export const listTemplates = () => call((db) => structuredClone(db.templates));

const MAX_TEMPLATES = 24;

export const saveTemplate = (tpl: Template) =>
	call((db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		const err = templateError(tpl);
		if (err) throw new ApiError(400, err);
		// Hanya simbol yang terpakai; sisa warna dari sesi menggambar tidak ikut tersimpan.
		const used = new Set([...tpl.rows.join('')].filter((c) => c !== '.'));
		const clean: Template = {
			id: tpl.id || crypto.randomUUID(),
			name: tpl.name.trim().slice(0, 80),
			colors: Object.fromEntries([...used].map((c) => [c, tpl.colors[c].toUpperCase()])),
			rows: [...tpl.rows]
		};
		const i = db.templates.findIndex((t) => t.id === clean.id);
		if (i < 0 && db.templates.length >= MAX_TEMPLATES) throw new ApiError(400, `Maksimal ${MAX_TEMPLATES} referensi.`);
		if (i < 0) db.templates.push(clean);
		else db.templates[i] = clean;
		return clean;
	});

export const deleteTemplate = (id: string) =>
	call((db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		db.templates = db.templates.filter((t) => t.id !== id);
	});

/** Angkat karya yang sudah ada menjadi referensi (tanpa editor kedua). */
export const templateFromArtwork = (id: string) =>
	call((db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		const r = db.projects[id];
		if (!r || r.deletedAt) throw new ApiError(404, 'Karya tidak ditemukan.');
		if (db.templates.length >= MAX_TEMPLATES) throw new ApiError(400, `Maksimal ${MAX_TEMPLATES} referensi.`);
		const tpl = templateFromProject(toProject(r), r.title ?? r.doc.name);
		if (!tpl) throw new ApiError(400, 'Karya ini masih kosong, tidak ada pola yang bisa diambil.');
		const err = templateError(tpl);
		if (err) throw new ApiError(400, `${err} Karya terlalu besar untuk dijadikan referensi.`);
		db.templates.push(tpl);
		return tpl;
	});

// ---------- template poster (PRD §9.14 FR-POSTER) ----------
const MAX_POSTERS = 8;
const MAX_DESIGN_BYTES = 1_000_000;

export const listPosterTemplates = () => call((db) => structuredClone(db.posterTemplates));

function clampArea(a: PosterArea): PosterArea {
	const int = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
	const x = int(a.x, POSTER_W - 1),
		y = int(a.y, POSTER_H - 1);
	return { x, y, width: Math.max(1, int(a.width, POSTER_W - x)), height: Math.max(1, int(a.height, POSTER_H - y)) };
}

export const createPosterTemplate = () =>
	call((db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		if (db.posterTemplates.length >= MAX_POSTERS) throw new ApiError(400, `Maksimal ${MAX_POSTERS} template poster.`);
		const t: PosterTemplate = {
			id: crypto.randomUUID(),
			name: 'Template baru',
			kind: 'image',
			area: { ...DEFAULT_POSTER_AREA },
			updatedAt: new Date().toISOString()
		};
		db.posterTemplates.push(t);
		return structuredClone(t);
	});

export const savePosterTemplate = (id: string, patch: { name?: string; area?: PosterArea }) =>
	call((db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		const t = db.posterTemplates.find((x) => x.id === id);
		if (!t) throw new ApiError(404, 'Template poster tidak ditemukan.');
		if (patch.name !== undefined) {
			const name = patch.name.trim();
			if (name.length < 1 || name.length > 60) throw new ApiError(400, 'Nama template 1–60 karakter.');
			t.name = name;
		}
		if (patch.area) t.area = clampArea(patch.area);
		t.updatedAt = new Date().toISOString();
		return structuredClone(t);
	});

export const deletePosterTemplate = (id: string) =>
	call(async (db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		// FR-POSTER-01: minimal satu template harus ada, kalau tidak dialog Bagikan kosong.
		if (db.posterTemplates.length <= 1) throw new ApiError(400, 'Minimal satu template poster harus ada.');
		const t = db.posterTemplates.find((x) => x.id === id);
		if (t?.assetId) await delAsset(t.assetId);
		db.posterTemplates = db.posterTemplates.filter((x) => x.id !== id);
	});

/** Unggah desain: PNG tepat 1080 × 1920, berkasnya masuk penyimpanan objek, katalog hanya memegang id. */
export async function uploadPosterDesign(id: string, file: File) {
	if (file.type !== 'image/png') throw new ApiError(400, 'Desain harus berkas PNG.');
	if (file.size > MAX_DESIGN_BYTES) throw new ApiError(413, 'Data template terlalu besar. Maksimal 1 MB.');
	let w = 0,
		h = 0;
	try {
		const bmp = await createImageBitmap(file);
		({ width: w, height: h } = bmp);
		bmp.close();
	} catch {
		throw new ApiError(400, 'Berkas PNG tidak dapat dibaca.');
	}
	if (w !== POSTER_W || h !== POSTER_H) throw new ApiError(400, `Ukuran desain harus tepat ${POSTER_W} × ${POSTER_H} piksel, bukan ${w} × ${h}.`);
	const assetId = crypto.randomUUID();
	await putAsset(assetId, file);
	return call(async (db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		const t = db.posterTemplates.find((x) => x.id === id);
		if (!t) throw new ApiError(404, 'Template poster tidak ditemukan.');
		const old = t.assetId;
		t.kind = 'image';
		t.assetId = assetId;
		t.presetId = undefined;
		t.area ??= { ...DEFAULT_POSTER_AREA };
		t.updatedAt = new Date().toISOString();
		if (old) await delAsset(old);
		return structuredClone(t);
	});
}

// ---------- proyek (owner-only) ----------
function ownRec(db: DB, id: string): Rec {
	const r = db.projects[id];
	if (!r) throw new ApiError(404, 'Karya tidak ditemukan.');
	if (!owns(r, principal(db))) throw new ApiError(403, 'Kamu tidak punya akses ke karya ini.');
	if (r.deletedAt) throw new ApiError(410, 'Karya ini berada di Sampah.', { purgeAfter: r.purgeAfter });
	return r;
}
function checkRevision(r: Rec, ifMatch: number) {
	if (r.revision !== ifMatch) throw new ApiError(409, 'Karya berubah di tempat lain.', { revision: r.revision });
}

export const listMyProjects = () =>
	call((db) => {
		const pr = principal(db);
		return Object.values(db.projects)
			.filter((r) => owns(r, pr) && !r.deletedAt)
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
			.map((r): Summary => ({ ...meta(r), id: r.id, name: r.doc.name, updatedAt: r.updatedAt, project: toProject(r) }));
	});

export const createCloudProject = (p: Project) =>
	call((db) => {
		const pr = principal(db);
		if (!pr.userId && db.claimedDevices.includes(pr.deviceId!))
			throw new ApiError(409, 'Perangkat ini sudah terhubung ke akun. Masuk untuk membuat karya baru.');
		const s = db.settings;
		if (p.widthMm !== s.canvas.widthMm || p.heightMm !== s.canvas.heightMm || p.cellMm !== s.canvas.cellMm)
			throw new ApiError(400, 'Ukuran papan berubah. Muat ulang studio sebelum membuat karya.');
		const same = p.palette.length === s.palette.length && p.palette.every((c, i) => c.id === s.palette[i].id && c.hex === s.palette[i].hex);
		if (!same) throw new ApiError(409, 'Palet Website telah berubah. Muat ulang studio sebelum membuat karya.');
		if (db.projects[p.id]) throw new ApiError(409, 'ID karya sudah dipakai.');
		const r = newRec(p, pr);
		db.projects[r.id] = r;
		return meta(r);
	});

export const getCloudProject = (id: string) =>
	call((db) => {
		const r = ownRec(db, id);
		return { project: toProject(r), meta: meta(r), updatedAt: r.updatedAt };
	});

export const updateCloudProject = (id: string, p: Project, ifMatch: number) =>
	call((db) => {
		const r = ownRec(db, id);
		checkRevision(r, ifMatch);
		if (p.columns !== r.doc.columns || p.rows !== r.doc.rows || p.palette.length !== r.doc.palette.length)
			throw new ApiError(403, 'Ukuran papan dan palet karya tidak bisa diubah.');
		r.cells = Array.from(p.cells);
		r.doc.name = p.name.slice(0, 200) || r.doc.name;
		r.revision++;
		r.updatedAt = r.doc.updatedAt = new Date().toISOString();
		place(db, r);
		return { revision: r.revision, updatedAt: r.updatedAt };
	});

export const deleteCloudProject = (id: string, ifMatch: number) =>
	call((db) => {
		const r = ownRec(db, id);
		checkRevision(r, ifMatch);
		r.deletedAt = new Date().toISOString();
		r.purgeAfter = new Date(Date.now() + 7 * 864e5).toISOString();
		r.placement = null;
		r.revision++;
		return { revision: r.revision, purgeAfter: r.purgeAfter };
	});

export type SaveInput = { title: string; creatorName: string; socialHandle: string; visibility: Visibility };
export const saveArtwork = (id: string, input: SaveInput, ifMatch: number) =>
	call((db) => {
		const r = ownRec(db, id);
		checkRevision(r, ifMatch);
		const title = input.title.trim(),
			creator = input.creatorName.trim(),
			social = input.socialHandle.trim();
		if (title.length > 200) throw new ApiError(400, 'Judul maksimal 200 karakter.');
		if (creator.length > 80) throw new ApiError(400, 'Nama kreator maksimal 80 karakter.');
		if (social.length > 120) throw new ApiError(400, 'Akun sosial maksimal 120 karakter.');
		if (input.visibility === 'public' && filledCount(Uint16Array.from(r.cells)) === 0)
			throw new ApiError(400, 'Isi minimal satu pixel sebelum menayangkan karya.');
		Object.assign(r, {
			title: title || null,
			creatorName: creator || null,
			socialHandle: social || null,
			visibility: input.visibility,
			savedAt: r.savedAt ?? new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			revision: r.revision + 1
		});
		if (title) r.doc.name = title;
		place(db, r);
		return meta(r);
	});

// ---------- publik ----------
function toPublic(r: Rec): PublicArtwork {
	return {
		id: r.id,
		title: r.title,
		creatorName: r.creatorName,
		socialHandle: r.socialHandle,
		updatedAt: r.updatedAt,
		revision: r.revision,
		project: toProject(r),
		bounds: contentBounds(cellsOf(r))!,
		placement: r.placement
	};
}
const publicList = (db: DB) =>
	Object.values(db.projects)
		.filter((r) => eligible(r) && r.placement)
		.sort((a, b) => b.savedAt!.localeCompare(a.savedAt!) || b.id.localeCompare(a.id));

export const publicArtworks = (limit = 6) => call((db) => publicList(db).slice(0, limit).map(toPublic));
// ponytail: tanpa paging viewport; semua karya publik dimuat sekaligus. Tambah filter viewport + kursor (PRD §13.5) saat datanya besar.
export const worldArtworks = () => call((db) => publicList(db).map(toPublic));
export const publicArtwork = (id: string) =>
	call((db) => {
		const r = db.projects[id];
		if (!r || !eligible(r) || !r.placement) throw new ApiError(404, 'Karya ini sudah tidak tersedia untuk publik.');
		return toPublic(r);
	});

// ---------- akun ----------
export type UserInfo = { id: string; username: string };
async function passHash(key: string, password: string) {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${key}:${password}`));
	// ponytail: SHA-256 hanya untuk mode demo lokal; server asli memakai scrypt (PRD SEC-02).
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function normalizeUsername(u: string) {
	const name = u.normalize('NFKC').trim();
	const len = [...name].length;
	if (len < 3 || len > 30 || [...name].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127))
		throw new ApiError(400, 'Username harus 3–30 karakter tanpa karakter kontrol.');
	return { name, key: name.toLocaleLowerCase('en-US') };
}
function checkPassword(p: string) {
	if (p.length < 8 || p.length > 128) throw new ApiError(400, 'Password harus 8–128 karakter.');
}
function claim(db: DB, userId: string) {
	const dev = device().id;
	let n = 0;
	for (const r of Object.values(db.projects))
		if (r.ownerDeviceId === dev && !r.deletedAt) {
			r.ownerUserId = userId;
			r.ownerDeviceId = null;
			n++;
		}
	if (!db.claimedDevices.includes(dev)) db.claimedDevices.push(dev);
	return n;
}

export async function signup(username: string, password: string) {
	const { name, key } = normalizeUsername(username);
	checkPassword(password);
	const hash = await passHash(key, password);
	return call((db) => {
		if (principal(db).userId) throw new ApiError(409, 'Kamu sudah masuk ke akun.');
		if (db.users[key]) throw new ApiError(409, 'Username sudah dipakai. Pilih username lain.');
		const user = { id: crypto.randomUUID(), username: name, passHash: hash };
		db.users[key] = user;
		const claimed = claim(db, user.id);
		set(SESSION_KEY, user.id);
		return { user: { id: user.id, username: user.username }, claimed };
	});
}

export async function login(username: string, password: string) {
	const { key } = normalizeUsername(username);
	checkPassword(password);
	const hash = await passHash(key, password);
	return call((db) => {
		const user = db.users[key];
		if (!user || user.passHash !== hash) throw new ApiError(401, 'Username atau password tidak sesuai.');
		const claimed = claim(db, user.id);
		set(SESSION_KEY, user.id);
		return { user: { id: user.id, username: user.username }, claimed };
	});
}

export const me = () =>
	call((db): UserInfo | null => {
		const uid = principal(db).userId;
		const u = uid ? Object.values(db.users).find((x) => x.id === uid) : null;
		return u ? { id: u.id, username: u.username } : null;
	});

export async function logout() {
	await wait();
	del(SESSION_KEY);
	rotateDevice(); // PRD FR-DEV-06
}

// ---------- admin ----------
// ponytail: satu password demo di klien. Server asli memverifikasi hash scrypt dari env (PRD SEC-03).
const ADMIN_DEMO_PASSWORD = 'mivubi-admin';
export async function adminLogin(password: string) {
	await wait();
	if (password !== ADMIN_DEMO_PASSWORD) throw new ApiError(401, 'Password Admin tidak sesuai.');
	set(ADMIN_KEY, String(Date.now() + 8 * 3600e3));
}
export const adminSession = () => Number(get(ADMIN_KEY) ?? 0) > Date.now();
export const adminLogout = () => del(ADMIN_KEY);

export type AdminItem = Summary & { ownerName: string | null };
export const adminArtworks = (status: 'all' | 'shown' | 'hidden', q: string) =>
	call((db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		const users = Object.values(db.users);
		const needle = q.trim().toLowerCase().slice(0, 100);
		return Object.values(db.projects)
			.filter((r) => r.savedAt && !r.deletedAt && (r.visibility === 'public' || r.takenDownAt)) // T20: takedown tetap terlihat
			.filter((r) => (status === 'shown' ? !r.takenDownAt : status === 'hidden' ? !!r.takenDownAt : true))
			.map((r): AdminItem => ({
				...meta(r),
				id: r.id,
				name: r.doc.name,
				updatedAt: r.updatedAt,
				project: toProject(r),
				ownerName: users.find((u) => u.id === r.ownerUserId)?.username ?? null
			}))
			.filter((a) => !needle || [a.title, a.creatorName, a.socialHandle, a.ownerName].some((v) => v?.toLowerCase().includes(needle)))
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	});

export const moderate = (id: string, action: 'take-down' | 'restore', reason = '') =>
	call((db) => {
		if (!adminSession()) throw new ApiError(401, 'Sesi admin diperlukan.');
		const r = db.projects[id];
		if (!r || !r.savedAt || r.deletedAt) throw new ApiError(404, 'Karya tidak ditemukan untuk moderasi.');
		// T15: moderasi tidak menaikkan revision agar Studio pemilik tidak kena konflik.
		if (action === 'take-down') {
			if (!reason.trim()) throw new ApiError(400, 'Alasan takedown wajib diisi.');
			r.takenDownAt = new Date().toISOString();
			r.takedownReason = reason.trim().slice(0, 500);
			r.placement = null;
		} else {
			if (!r.cells.some((c) => c !== 0xffff)) throw new ApiError(409, 'Karya kosong tidak dapat dikembalikan ke Canvas World.');
			r.takenDownAt = null;
			r.takedownReason = null;
			place(db, r);
		}
	});

// ---------- cadangan lokal (PRD FR-SAVE-01) ----------
// ponytail: localStorage, bukan IndexedDB; cukup untuk papan 48 × 24. Pindah ke IndexedDB kalau papan besar melewati kuota.
const DRAFT = (id: string) => `mivubi-draft:${id}`;
export function saveDraft(p: Project) {
	return set(DRAFT(p.id), JSON.stringify({ ...p, cells: Array.from(p.cells) }));
}
export function readDraft(id: string): Project | null {
	try {
		const d = JSON.parse(get(DRAFT(id)) ?? '');
		return { ...d, cells: Uint16Array.from(d.cells) };
	} catch {
		return null;
	}
}
export const clearDraft = (id: string) => del(DRAFT(id));
