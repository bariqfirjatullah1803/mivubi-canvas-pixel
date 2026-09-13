<script lang="ts">
	// Papan komunitas sebagai latar landing page: karya publik terbaru disusun di papan ivory
	// yang bergeser terus ke kiri tanpa ujung, seperti dunia yang berputar.
	import { EMPTY } from '$lib/grid';
	import { publicArtworks, type PublicArtwork } from '$lib/store';
	import { IVORY, drawBlock } from '$lib/render';

	const LIMIT = 60;
	const SPEED = 24; // px per detik
	const GAP = 4; // sel antar karya

	let items = $state<PublicArtwork[]>([]);
	let status = $state<'loading' | 'ok' | 'empty' | 'error'>('loading');
	let host: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let size = $state({ w: 0, h: 0 });
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

	async function refresh() {
		if (document.hidden) return;
		try {
			const next = await publicArtworks(LIMIT);
			// Hanya bangun ulang papan kalau daftar karya berubah.
			if (next.map((a) => `${a.id}:${a.revision}`).join() !== items.map((a) => `${a.id}:${a.revision}`).join()) items = next;
			status = next.length ? 'ok' : 'empty';
		} catch {
			status = 'error';
		}
	}

	$effect(() => {
		refresh();
		const t = setInterval(refresh, 30_000);
		const vis = () => !document.hidden && refresh();
		document.addEventListener('visibilitychange', vis);
		return () => {
			clearInterval(t);
			document.removeEventListener('visibilitychange', vis);
		};
	});

	$effect(() => {
		if (!host) return;
		const ro = new ResizeObserver(([e]) => (size = { w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
		ro.observe(host);
		return () => ro.disconnect();
	});

	/** Susun karya ke kolom-kolom, ulangi daftarnya sampai papan lebih lebar dari layar. */
	function layout(rows: number, minCols: number) {
		const boxes = items
			.map((a) => ({ a, w: a.bounds.maxX - a.bounds.minX + 1, h: a.bounds.maxY - a.bounds.minY + 1 }))
			.filter((b) => b.h <= rows - GAP * 2);
		const placed: { a: PublicArtwork; x: number; y: number }[] = [];
		let x = GAP;
		for (let round = 0; boxes.length && round < 12 && (round === 0 || x < minCols); round++) {
			let i = 0;
			while (i < boxes.length) {
				const col: { b: (typeof boxes)[number]; y: number }[] = [];
				let y = GAP;
				let colW = 0;
				while (i < boxes.length && y + boxes[i].h <= rows - GAP) {
					col.push({ b: boxes[i], y });
					y += boxes[i].h + GAP + ((i * 7) % 3);
					colW = Math.max(colW, boxes[i].w);
					i++;
				}
				const shift = Math.floor((rows - GAP - y) / 2);
				for (const c of col) placed.push({ a: c.b.a, x: x + Math.floor((colW - c.b.w) / 2), y: c.y + shift });
				x += colW + GAP + (col.length % 2);
			}
		}
		return { placed, cols: Math.max(x, minCols) };
	}

	let offset = 0;

	$effect(() => {
		const { w, h } = size;
		if (!w || !h || !canvas) return;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const cell = w <= 600 ? 8 : 10;
		const rows = Math.ceil(h / cell);
		const { placed, cols } = layout(rows, Math.ceil(w / cell) + 8);

		// Papan digambar sekali ke kanvas offscreen, lalu hanya digeser tiap frame.
		const tile = document.createElement('canvas');
		tile.width = cols * cell * dpr;
		tile.height = rows * cell * dpr;
		const t = tile.getContext('2d')!;
		t.setTransform(dpr, 0, 0, dpr, 0, 0);
		t.fillStyle = IVORY;
		t.fillRect(0, 0, cols * cell, rows * cell);
		t.fillStyle = 'rgba(21,61,43,0.09)';
		for (let i = 0; i < cols; i++) t.fillRect(i * cell, 0, 1 / dpr, rows * cell);
		for (let j = 0; j < rows; j++) t.fillRect(0, j * cell, cols * cell, 1 / dpr);
		for (const { a, x, y } of placed) {
			const b = a.bounds,
				p = a.project;
			for (let cy = b.minY; cy <= b.maxY; cy++)
				for (let cx = b.minX; cx <= b.maxX; cx++) {
					const v = p.cells[cy * p.columns + cx];
					if (v !== EMPTY && p.palette[v]) drawBlock(t, (x + cx - b.minX) * cell, (y + cy - b.minY) * cell, cell, p.palette[v].hex, dpr);
				}
		}

		canvas.width = w * dpr;
		canvas.height = h * dpr;
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;
		const period = tile.width;
		let last = performance.now();
		let raf = 0;
		const frame = (now: number) => {
			if (!reduced) offset = (offset + ((now - last) / 1000) * SPEED * dpr) % period;
			last = now;
			for (let x = -Math.round(offset); x < canvas!.width; x += period) ctx.drawImage(tile, x, 0);
			if (!reduced) raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	});
</script>

<div class="board" bind:this={host} aria-hidden="true">
	<canvas bind:this={canvas}></canvas>
</div>
<p class="visually-hidden" role="status">
	{#if status === 'empty'}Panggung masih kosong. Jadilah yang pertama berkarya.
	{:else if status === 'error'}Karya komunitas belum dapat dimuat. Kamu tetap bisa mulai berkarya.{/if}
</p>

<style>
	.board {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
