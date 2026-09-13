// Tiruan object storage untuk berkas biner (desain poster).
// ponytail: IndexedDB sebagai pengganti R2 — localStorage tidak cukup untuk PNG 1080 × 1920.
// Saat backend siap, ganti putAsset/getAsset dengan PUT/GET bertanda tangan ke R2.

const DB_NAME = 'mivubi-assets';
const STORE = 'files';

let dbp: Promise<IDBDatabase> | null = null;
function db() {
	dbp ??= new Promise<IDBDatabase>((res, rej) => {
		const r = indexedDB.open(DB_NAME, 1);
		r.onupgradeneeded = () => r.result.createObjectStore(STORE);
		r.onsuccess = () => res(r.result);
		r.onerror = () => rej(r.error);
	});
	return dbp;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	return db().then(
		(d) =>
			new Promise<T>((res, rej) => {
				const req = fn(d.transaction(STORE, mode).objectStore(STORE));
				req.onsuccess = () => res(req.result);
				req.onerror = () => rej(req.error);
			})
	);
}

export const putAsset = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id)).then(() => {});
export const getAsset = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id)).then((b) => b ?? null);

const urls = new Map<string, string>();

/** URL objek yang di-cache per id; dipakai <img> dan renderer poster. */
export async function assetUrl(id: string): Promise<string | null> {
	if (!urls.has(id)) {
		const blob = await getAsset(id).catch(() => null);
		if (!blob) return null;
		urls.set(id, URL.createObjectURL(blob));
	}
	return urls.get(id)!;
}

export async function delAsset(id: string) {
	const u = urls.get(id);
	if (u) {
		URL.revokeObjectURL(u);
		urls.delete(id);
	}
	await tx('readwrite', (s) => s.delete(id)).catch(() => {});
}
