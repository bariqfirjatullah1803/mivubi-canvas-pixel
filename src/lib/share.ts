// Bagikan / unduh / salin link dengan hasil yang dilaporkan jujur (PRD FR-EXP-05, Lampiran D).

export const artUrl = (id: string) => `${location.origin}/art/${id}`;

export async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export function download(blob: Blob, name: string) {
	try {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
		return true;
	} catch {
		return false;
	}
}

/** Kembalikan pesan hasil, atau '' kalau pengguna membatalkan share. */
export async function shareOrFallback(blob: Blob, name: string, title: string, link: string | null) {
	const file = new File([blob], name, { type: 'image/png' });
	if (navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file], title, text: 'Pixel Art dari MIVUBI Canvas Pixel' });
			return 'Karya berhasil dibagikan.';
		} catch (e) {
			if ((e as Error).name === 'AbortError') return '';
		}
	}
	const downloaded = download(blob, name);
	const copied = link ? await copyText(link) : false;
	if (downloaded && copied) return 'PNG diunduh dan link karya disalin.';
	if (downloaded && link) return 'PNG diunduh; link belum dapat disalin.';
	if (downloaded) return 'PNG karya diunduh.';
	if (copied) return 'Link karya disalin; PNG belum dapat diunduh.';
	return 'Browser tidak menyediakan fitur berbagi, unduh, atau salin link.';
}
