// Klien API: semua data lewat server (/api, Neon + R2). Nama fungsi sama dengan
// tiruan localStorage sebelumnya, jadi komponen tidak perlu tahu datanya dari mana.
// Yang tetap di browser hanya cadangan draf (saveDraft/readDraft/clearDraft).
import type { CanvasSettings, Project, SiteColor, Template } from './grid';
import type { PosterArea, PosterTemplate } from './render';
import type { Bounds } from './grid';
import type { Placement } from './world';

export type { Placement } from './world';
export type Visibility = 'private' | 'public';
export type Settings = { canvas: CanvasSettings; palette: SiteColor[]; gap: number };

export type Meta = {
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
};
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
export type SaveInput = { title: string; creatorName: string; socialHandle: string; visibility: Visibility };
export type UserInfo = { id: string; username: string };
export type AdminItem = Summary & { ownerName: string | null };

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

// ---------- transport ----------
async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
	const init: RequestInit = { method };
	if (body instanceof Blob) {
		init.body = body;
		init.headers = { 'content-type': body.type || 'application/octet-stream' };
	} else if (body !== undefined) {
		init.body = JSON.stringify(body);
		init.headers = { 'content-type': 'application/json' };
	}
	let res: Response;
	try {
		res = await fetch(path, init);
	} catch {
		// status 0 = jaringan putus; Studio memakai ini untuk membuka cadangan lokal.
		throw new ApiError(0, 'Tidak dapat terhubung ke server.');
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new ApiError(res.status, data.message ?? `Permintaan gagal (${res.status}).`, data.detail ?? {});
	return data as T;
}

const qs = (o: Record<string, string | number | undefined>) =>
	'?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined) as [string, string][]).toString();

// Sel dikirim sebagai array angka; di klien selalu Uint16Array.
type Wire<T> = Omit<T, 'project'> & { project: Omit<Project, 'cells'> & { cells: number[] } };
const cellsIn = (p: Omit<Project, 'cells'> & { cells: number[] }): Project => ({ ...p, cells: Uint16Array.from(p.cells) });
const cellsOut = (p: Project) => ({ ...p, cells: Array.from(p.cells) });
const withCells = <T extends { project: Project }>(x: Wire<T>) => ({ ...x, project: cellsIn(x.project) }) as unknown as T;

// ---------- pengaturan ----------
export const getSettings = () => req<Settings>('GET', '/api/settings');

export const saveCanvasSettings = (widthCm: number, heightCm: number, cellCm: number) =>
	req<Settings>('PATCH', '/api/settings', {
		canvas: { widthMm: Math.round(widthCm * 10), heightMm: Math.round(heightCm * 10), cellMm: Math.round(cellCm * 10) }
	});

/** Satu warna per baris: "#RRGGBB | Nama". Divalidasi di klien supaya galat menunjuk barisnya. */
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

export const savePalette = (text: string) => req<Settings>('PATCH', '/api/settings', { palette: parsePaletteText(text) });
export const saveGap = (gap: number) => req<Settings>('PATCH', '/api/settings', { gap });

// ---------- referensi pola ----------
export const listTemplates = () => req<Template[]>('GET', '/api/templates');
export const saveTemplate = (tpl: Template) => req<Template>('POST', '/api/templates', tpl);
export const deleteTemplate = (id: string) => req('DELETE', `/api/templates/${id}`);
export const templateFromArtwork = (id: string) => req<Template>('POST', '/api/templates/from-artwork', { id });

// ---------- template poster ----------
export const listPosterTemplates = () => req<PosterTemplate[]>('GET', '/api/poster-templates');
export const createPosterTemplate = () => req<PosterTemplate>('POST', '/api/poster-templates');
export const savePosterTemplate = (id: string, patch: { name?: string; area?: PosterArea }) =>
	req<PosterTemplate>('PATCH', `/api/poster-templates/${id}`, patch);
export const deletePosterTemplate = (id: string) => req('DELETE', `/api/poster-templates/${id}`);
export const uploadPosterDesign = (id: string, file: File) => req<PosterTemplate>('POST', `/api/poster-templates/${id}/design`, file);

// ---------- karya milik sendiri ----------
export const listMyProjects = async () => (await req<Wire<Summary>[]>('GET', '/api/projects')).map(withCells);
export const createCloudProject = (p: Project) => req<Meta>('POST', '/api/projects', cellsOut(p));

export async function getCloudProject(id: string) {
	const r = await req<Wire<{ project: Project; meta: Meta; updatedAt: string }>>('GET', `/api/projects/${id}`);
	return withCells(r);
}

export const updateCloudProject = (id: string, p: Project, ifMatch: number) =>
	req<{ revision: number; updatedAt: string }>('PUT', `/api/projects/${id}`, { project: cellsOut(p), ifMatch });

export const deleteCloudProject = (id: string, ifMatch: number) =>
	req<{ revision: number; purgeAfter: string }>('DELETE', `/api/projects/${id}${qs({ ifMatch })}`);

export const saveArtwork = (id: string, input: SaveInput, ifMatch: number) =>
	req<Meta>('POST', `/api/projects/${id}/save`, { ...input, ifMatch });

// ---------- publik ----------
export const publicArtworks = async (limit = 6) => (await req<Wire<PublicArtwork>[]>('GET', `/api/public/artworks${qs({ limit })}`)).map(withCells);
// ponytail: semua karya publik dimuat sekaligus. Tambah filter viewport + kursor (PRD §13.5) saat datanya besar.
export const worldArtworks = async () => (await req<Wire<PublicArtwork>[]>('GET', '/api/public/artworks')).map(withCells);
export const publicArtwork = async (id: string) => withCells(await req<Wire<PublicArtwork>>('GET', `/api/public/artworks/${id}`));

// ---------- akun ----------
type AuthResult = { user: UserInfo; claimed: number };
export const signup = (username: string, password: string) => req<AuthResult>('POST', '/api/auth/signup', { username, password });
export const login = (username: string, password: string) => req<AuthResult>('POST', '/api/auth/login', { username, password });
export const me = async () => (await req<{ user: UserInfo | null }>('GET', '/api/auth/me')).user;
export const logout = () => req('POST', '/api/auth/logout');

// ---------- admin ----------
export const adminLogin = (password: string) => req('POST', '/api/admin/session', { password });
export const adminSession = async () => (await req<{ admin: boolean }>('GET', '/api/admin/session')).admin;
export const adminLogout = () => req('DELETE', '/api/admin/session');

export const adminArtworks = async (status: 'all' | 'shown' | 'hidden', q: string) =>
	(await req<Wire<AdminItem>[]>('GET', `/api/admin/artworks${qs({ status, q })}`)).map(withCells);

export const moderate = (id: string, action: 'take-down' | 'restore', reason = '') =>
	req('POST', `/api/admin/artworks/${id}/moderate`, { action, reason });

// ---------- cadangan lokal (PRD FR-SAVE-01) ----------
// ponytail: localStorage, bukan IndexedDB; cukup untuk papan 48 × 24. Pindah ke IndexedDB kalau papan besar melewati kuota.
const DRAFT = (id: string) => `mivubi-draft:${id}`;

export function saveDraft(p: Project) {
	try {
		localStorage.setItem(DRAFT(p.id), JSON.stringify({ ...p, cells: Array.from(p.cells) }));
		return true;
	} catch {
		return false;
	}
}

export function readDraft(id: string): Project | null {
	try {
		const d = JSON.parse(localStorage.getItem(DRAFT(id)) ?? '');
		return { ...d, cells: Uint16Array.from(d.cells) };
	} catch {
		return null;
	}
}

export function clearDraft(id: string) {
	try {
		localStorage.removeItem(DRAFT(id));
	} catch {
		/* tidak ada yang perlu dibersihkan */
	}
}
