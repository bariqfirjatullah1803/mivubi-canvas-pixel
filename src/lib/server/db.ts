// Satu pool per proses. Neon diakses lewat TCP biasa (pg), bukan driver HTTP,
// karena penempatan Canvas World butuh transaksi dengan advisory lock (PRD §13.4).
import pg from 'pg';
import { databaseUrl } from './env';

let pool: pg.Pool | null = null;

export function db(): pg.Pool {
	pool ??= new pg.Pool({
		connectionString: databaseUrl(),
		max: 8,
		keepAlive: true,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 15_000
	});
	pool.on('error', (e) => console.error('[db] koneksi idle putus:', e.message));
	return pool;
}

// Neon menidurkan compute-nya saat menganggur; permintaan pertama setelah itu bisa
// gagal di level koneksi. Sekali coba lagi sudah cukup, bukan galat 500 ke pengguna.
const wakeable = (e: unknown) => {
	const m = (e as Error)?.message ?? '';
	return /terminat|ECONNRESET|ETIMEDOUT|ENOTFOUND|Connection terminated|timeout expired|socket hang up/i.test(m);
};

export async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
	try {
		return (await db().query<T>(sql, params)).rows;
	} catch (e) {
		if (!wakeable(e)) throw e;
		return (await db().query<T>(sql, params)).rows;
	}
}

export async function one<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
	const rows = await q<T>(sql, params);
	return rows[0] ?? null;
}

/** Transaksi; rollback otomatis kalau fn melempar. */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
	const c = await db().connect();
	try {
		await c.query('begin');
		const out = await fn(c);
		await c.query('commit');
		return out;
	} catch (e) {
		await c.query('rollback').catch(() => {});
		throw e;
	} finally {
		c.release();
	}
}
