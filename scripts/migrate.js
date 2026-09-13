// Jalankan db/migrations/*.sql berurutan, satu transaksi per berkas.
// node --env-file=.env scripts/migrate.js
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const dir = join(process.cwd(), 'db/migrations');
// DATABASE_URL_DEV dipakai lebih dulu: pengembangan tidak boleh menyentuh database produksi.
const url = process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL belum diisi.');
console.log(`database ${new URL(url).pathname.slice(1)}`);

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
const done = new Set((await client.query('select name from schema_migrations')).rows.map((r) => r.name));

for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
	if (done.has(name)) {
		console.log(`lewati  ${name}`);
		continue;
	}
	const sql = readFileSync(join(dir, name), 'utf8');
	try {
		await client.query('begin');
		await client.query(sql);
		await client.query('insert into schema_migrations (name) values ($1)', [name]);
		await client.query('commit');
		console.log(`terapkan ${name}`);
	} catch (e) {
		await client.query('rollback');
		console.error(`GAGAL   ${name}: ${e.message}`);
		process.exitCode = 1;
		break;
	}
}
await client.end();
