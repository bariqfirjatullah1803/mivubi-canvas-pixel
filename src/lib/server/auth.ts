// Identitas: perangkat tamu, akun, dan Admin (PRD §17 SEC-01…SEC-05).
import { createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import type { Cookies } from '@sveltejs/kit';
import { need } from './env';
import { one, q } from './db';

const scrypt = promisify(_scrypt) as (p: string | Buffer, s: string | Buffer, k: number) => Promise<Buffer>;

export const COOKIE = { device: 'mv_device', user: 'mv_session', admin: 'mv_admin' } as const;
const base = { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } as const;

// ---------- password ----------
/** Format: scrypt$<salt base64url>$<hash base64url>, keylen 64 (skrip admin:hash-password). */
export async function hashPassword(password: string, salt = randomBytes(16)) {
	const key = await scrypt(password.normalize('NFKC'), salt, 64);
	return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string) {
	const [scheme, saltB64, hashB64] = stored.split('$');
	if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
	const expect = Buffer.from(hashB64, 'base64url');
	const got = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expect.length);
	return expect.length === got.length && timingSafeEqual(expect, got);
}

// ---------- token bertanda tangan ----------
const key = (secret: string) => new TextEncoder().encode(secret);

async function sign(payload: Record<string, unknown>, secret: string, hours: number) {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${hours}h`)
		.sign(key(secret));
}

async function read<T>(token: string | undefined, secret: string): Promise<T | null> {
	if (!token) return null;
	try {
		return (await jwtVerify(token, key(secret))).payload as T;
	} catch {
		return null;
	}
}

// ---------- perangkat ----------
const deviceHash = (secret: string) => createHmac('sha256', need('DEVICE_TOKEN_PEPPER')).update(secret).digest('base64url');

/** Buat perangkat baru dan kembalikan token "id.secret" untuk disimpan di cookie. */
export async function createDevice(): Promise<{ id: string; token: string }> {
	const secret = randomBytes(32).toString('base64url');
	const row = await one<{ id: string }>('insert into devices (secret_hash) values ($1) returning id', [deviceHash(secret)]);
	return { id: row!.id, token: `${row!.id}.${secret}` };
}

export async function deviceFromToken(token: string | undefined): Promise<string | null> {
	if (!token) return null;
	const i = token.indexOf('.');
	if (i < 0) return null;
	const id = token.slice(0, i),
		secret = token.slice(i + 1);
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	const row = await one<{ id: string }>('select id from devices where id = $1 and secret_hash = $2', [id, deviceHash(secret)]);
	if (row) void q('update devices set last_seen_at = now() where id = $1', [id]).catch(() => {});
	return row?.id ?? null;
}

/** Perangkat dari cookie; dibuat kalau belum ada, sehingga tamu tetap punya pemilik. */
export async function ensureDevice(cookies: Cookies): Promise<string> {
	const existing = await deviceFromToken(cookies.get(COOKIE.device));
	if (existing) return existing;
	const d = await createDevice();
	cookies.set(COOKIE.device, d.token, { ...base, maxAge: 60 * 60 * 24 * 365 * 2 });
	return d.id;
}

// ---------- sesi akun ----------
export const setUserSession = async (cookies: Cookies, userId: string) =>
	cookies.set(COOKIE.user, await sign({ sub: userId }, need('USER_SESSION_SECRET'), 24 * 30), { ...base, maxAge: 60 * 60 * 24 * 30 });

export const clearUserSession = (cookies: Cookies) => cookies.delete(COOKIE.user, { path: '/' });

export async function userFromCookies(cookies: Cookies): Promise<string | null> {
	const p = await read<{ sub?: string }>(cookies.get(COOKIE.user), need('USER_SESSION_SECRET'));
	if (!p?.sub) return null;
	const row = await one<{ id: string }>('select id from users where id = $1', [p.sub]);
	return row?.id ?? null;
}

// ---------- sesi admin ----------
export const setAdminSession = async (cookies: Cookies) =>
	cookies.set(COOKIE.admin, await sign({ role: 'admin' }, need('ADMIN_SESSION_SECRET'), 8), { ...base, maxAge: 60 * 60 * 8 });

export const clearAdminSession = (cookies: Cookies) => cookies.delete(COOKIE.admin, { path: '/' });

export async function isAdmin(cookies: Cookies): Promise<boolean> {
	const p = await read<{ role?: string }>(cookies.get(COOKIE.admin), need('ADMIN_SESSION_SECRET'));
	return p?.role === 'admin';
}
