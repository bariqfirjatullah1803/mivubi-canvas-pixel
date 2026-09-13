// Env dibaca saat dipakai (bukan saat impor) supaya pesan galatnya jelas dan
// build tidak ikut memaksa nilai produksi ada di mesin pengembang.
import { env } from '$env/dynamic/private';

export function need(name: string): string {
	const v = env[name];
	if (!v) throw new Error(`Env ${name} belum diisi. Lihat .env.example.`);
	return v;
}

export const opt = (name: string, fallback = '') => env[name] || fallback;

/** DATABASE_URL_DEV menang kalau ada: pengembangan tidak menyentuh database produksi. */
export const databaseUrl = () => env.DATABASE_URL_DEV || need('DATABASE_URL');

export const r2Config = () => ({
	endpoint: need('R2_ENDPOINT').replace(/\/$/, ''),
	bucket: need('R2_BUCKET_NAME'),
	region: opt('R2_REGION', 'auto'),
	accessKeyId: need('R2_ACCESS_KEY_ID'),
	secretAccessKey: need('R2_SECRET_ACCESS_KEY')
});
