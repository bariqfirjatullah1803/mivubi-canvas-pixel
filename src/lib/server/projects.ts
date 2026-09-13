// Query dan aturan karya: pemilik, revisi, dan penempatan Canvas World.
import type { PoolClient } from 'pg';
import { EMPTY, contentBounds, lockPalette, type Project } from '$lib/grid';
import { candidates, collides, type Placement } from '$lib/world';
import { HttpError } from './api';
import { one, q, tx } from './db';

export type Row = {
	id: string;
	owner_user_id: string | null;
	owner_device_id: string | null;
	doc: Omit<Project, 'cells'>;
	cells: Buffer;
	revision: number;
	visibility: 'private' | 'public';
	saved_at: string | null;
	title: string | null;
	creator_name: string | null;
	social_handle: string | null;
	taken_down_at: string | null;
	takedown_reason: string | null;
	deleted_at: string | null;
	purge_after: string | null;
	updated_at: string;
};

export const COLS =
	'id, owner_user_id, owner_device_id, doc, cells, revision, visibility, saved_at, title, creator_name, social_handle, taken_down_at, takedown_reason, deleted_at, purge_after, updated_at';

export function bufToCells(b: Buffer): number[] {
	const out = new Array<number>(b.length >> 1);
	for (let i = 0; i < out.length; i++) out[i] = b.readUInt16LE(i * 2);
	return out;
}

export function cellsToBuf(cells: ArrayLike<number>): Buffer {
	const b = Buffer.allocUnsafe(cells.length * 2);
	for (let i = 0; i < cells.length; i++) b.writeUInt16LE(cells[i] & 0xffff, i * 2);
	return b;
}

export const toProject = (r: Row): Project & { cells: number[] } => ({ ...r.doc, cells: bufToCells(r.cells) } as never);

export const toMeta = (r: Row) => ({
	revision: r.revision,
	visibility: r.visibility,
	savedAt: r.saved_at,
	title: r.title,
	creatorName: r.creator_name,
	socialHandle: r.social_handle,
	takenDownAt: r.taken_down_at,
	takedownReason: r.takedown_reason,
	deletedAt: r.deleted_at,
	purgeAfter: r.purge_after
});

export const toSummary = (r: Row) => ({ ...toMeta(r), id: r.id, name: r.doc.name, updatedAt: r.updated_at, project: toProject(r) });

const grid = (r: Row) => ({ cells: Uint16Array.from(bufToCells(r.cells)), columns: r.doc.columns, rows: r.doc.rows });

/** Layak tampil di World: publik, tersimpan, tidak ditakedown, dan tidak kosong. */
export const eligible = (r: Row) =>
	!!r.saved_at && r.visibility === 'public' && !r.deleted_at && !r.taken_down_at && bufToCells(r.cells).some((c) => c !== EMPTY);

export async function ownRow(id: string, principal: { userId: string | null; deviceId: string }): Promise<Row> {
	const r = await one<Row>(`select ${COLS} from projects where id = $1`, [id]);
	if (!r || r.deleted_at) throw new HttpError(404, 'Karya tidak ditemukan.');
	const mine = principal.userId ? r.owner_user_id === principal.userId : r.owner_device_id === principal.deviceId && !r.owner_user_id;
	if (!mine) throw new HttpError(403, 'Kamu tidak punya akses ke karya ini.');
	return r;
}

export function checkRevision(r: Row, ifMatch: number) {
	if (Number(ifMatch) !== r.revision)
		throw new HttpError(409, 'Karya ini sudah berubah di perangkat lain. Muat versi terbaru sebelum menyimpan.');
}

// ---------- penempatan ----------
const WORLD_LOCK = 4211;

/** Hitung ulang posisi satu karya di World. Dijalankan di dalam transaksi dengan advisory lock. */
export async function replace(c: PoolClient, r: Row, gap: number) {
	await c.query('select pg_advisory_xact_lock($1)', [WORLD_LOCK]);
	if (!eligible(r)) {
		await c.query('delete from placements where project_id = $1', [r.id]);
		return null;
	}
	const b = contentBounds(grid(r));
	if (!b) {
		await c.query('delete from placements where project_id = $1', [r.id]);
		return null;
	}
	const w = b.maxX - b.minX + 1,
		h = b.maxY - b.minY + 1;
	const others = (
		await c.query<{ x: number; y: number; w: number; h: number; gap: number }>(
			'select x, y, w, h, gap from placements where project_id <> $1',
			[r.id]
		)
	).rows;
	const fits = (p: Placement) => !others.some((o) => collides(p, o));

	const current = (await c.query<{ x: number; y: number }>('select x, y from placements where project_id = $1', [r.id])).rows[0];
	const spots: Placement[] = [];
	if (current) spots.push({ x: current.x, y: current.y, w, h, gap });
	for (const [x, y] of candidates(w, h, gap, `${r.saved_at}:${r.id}`)) spots.push({ x, y, w, h, gap });

	for (const spot of spots) {
		if (!fits(spot)) continue;
		try {
			await c.query(
				`insert into placements (project_id, x, y, w, h, gap) values ($1, $2, $3, $4, $5, $6)
				 on conflict (project_id) do update set x = excluded.x, y = excluded.y, w = excluded.w, h = excluded.h, gap = excluded.gap`,
				[r.id, spot.x, spot.y, w, h, gap]
			);
			return spot;
		} catch (e) {
			// 23P01 = exclusion_violation: kandidat ini ternyata bertabrakan, coba berikutnya.
			if ((e as { code?: string }).code !== '23P01') throw e;
		}
	}
	// PRD T4: pesan jelas saat World penuh, bukan galat 500 generik.
	throw new HttpError(503, 'Canvas World sedang penuh di sekitar pusat. Coba lagi nanti.');
}

export const gapSetting = async () => Number((await one<{ gap: number }>('select gap from settings where id = 1'))!.gap);

/** Bungkus satu perubahan karya + penempatannya dalam satu transaksi. */
export function withPlacement<T>(fn: (c: PoolClient) => Promise<T>) {
	return tx(fn);
}

export const placementOf = async (id: string) =>
	one<Placement>('select x, y, w, h, gap from placements where project_id = $1', [id]);

export const publicRows = (limit?: number) =>
	q<Row & { px: number; py: number; pw: number; ph: number; pgap: number }>(
		`select ${COLS.split(', ').map((c) => 'p.' + c).join(', ')}, pl.x px, pl.y py, pl.w pw, pl.h ph, pl.gap pgap
		 from projects p join placements pl on pl.project_id = p.id
		 where p.visibility = 'public' and p.taken_down_at is null and p.deleted_at is null
		 order by p.saved_at desc, p.id desc
		 ${limit ? 'limit ' + Number(limit) : ''}`
	);

export function toPublic(r: Row & { px?: number; py?: number; pw?: number; ph?: number; pgap?: number }) {
	return {
		id: r.id,
		title: r.title,
		creatorName: r.creator_name,
		socialHandle: r.social_handle,
		updatedAt: r.updated_at,
		revision: r.revision,
		project: toProject(r),
		bounds: contentBounds(grid(r))!,
		placement: r.px === undefined ? null : { x: r.px, y: r.py!, w: r.pw!, h: r.ph!, gap: r.pgap! }
	};
}

export { lockPalette };
