<script lang="ts">
	// Canvas World (PRD F10, FR-WORLD, DESIGN §7.5).
	import MiniBoard from '$lib/components/MiniBoard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { displayCreator, displayTitle, publicArtwork, worldArtworks, type ApiError, type PublicArtwork } from '$lib/store';
	import { drawCells, fitCanvas } from '$lib/render';

	const UNIT = 9;
	const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

	let items: PublicArtwork[] = $state([]);
	let status: 'loading' | 'ok' | 'error' = $state('loading');
	let loadError = $state('');
	let host: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let size = $state({ w: 0, h: 0 });
	let cam = $state({ x: 0, y: 0, zoom: 0.9 });
	let hot: string | null = $state(null);
	let tip: { a: PublicArtwork; x: number; y: number } | null = $state(null);
	let detail: PublicArtwork | null = $state(null);
	let detailError: string | null = $state(null);
	let detailOpen = $state(false);
	let framed = false;
	// Pratinjau detail ikut tinggi layar, jadi karya tinggi-ramping tetap utuh tanpa scroll.
	let vh = $state(800);
	const boardMax = $derived(Math.max(180, Math.round(vh * 0.52)));

	async function load() {
		status = 'loading';
		try {
			items = await worldArtworks();
			status = 'ok';
			if (!framed && size.w) frameAll();
		} catch (e) {
			loadError = (e as ApiError).message;
			status = 'error';
		}
	}
	$effect(() => {
		load();
	});

	$effect(() => {
		if (!host) return;
		const ro = new ResizeObserver(([e]) => {
			size = { w: e.contentRect.width, h: e.contentRect.height };
			if (!framed && items.length) frameAll();
		});
		ro.observe(host);
		return () => ro.disconnect();
	});

	function frameAll() {
		if (!items.length || !size.w) {
			cam = { x: 0, y: 0, zoom: 0.9 };
			return;
		}
		framed = true;
		const ps = items.map((a) => a.placement!);
		const minX = Math.min(...ps.map((p) => p.x)),
			minY = Math.min(...ps.map((p) => p.y));
		const maxX = Math.max(...ps.map((p) => p.x + p.w)),
			maxY = Math.max(...ps.map((p) => p.y + p.h));
		const zoom = clamp(Math.min(size.w / ((maxX - minX + 10) * UNIT), size.h / ((maxY - minY + 10) * UNIT)), 0.35, 3.2);
		cam = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom };
	}

	const cell = $derived(UNIT * cam.zoom);
	const toScreen = (wx: number, wy: number) => ({ x: (wx - cam.x) * cell + size.w / 2, y: (wy - cam.y) * cell + size.h / 2 });
	const visible = $derived(
		items.filter((a) => {
			const p = a.placement!,
				s = toScreen(p.x, p.y);
			return s.x < size.w && s.y < size.h && s.x + p.w * cell > 0 && s.y + p.h * cell > 0;
		})
	);

	$effect(() => {
		const { w, h } = size;
		if (!w || !h || !canvas) return;
		const { ctx, dpr } = fitCanvas(canvas, w, h);
		const css = getComputedStyle(host!);
		const line = css.getPropertyValue('--line').trim() || '#D0D7CD';
		const c = cell;
		// Grid dua tingkat yang ikut pan/zoom (FR-WORLD-01).
		const x0 = Math.floor(cam.x - w / 2 / c) - 1,
			x1 = Math.ceil(cam.x + w / 2 / c) + 1;
		const y0 = Math.floor(cam.y - h / 2 / c) - 1,
			y1 = Math.ceil(cam.y + h / 2 / c) + 1;
		ctx.fillStyle = line;
		const px = 1 / dpr;
		for (let gx = x0; gx <= x1; gx++) {
			if (c < 5 && gx % 5) continue;
			ctx.globalAlpha = gx % 5 ? 0.5 : 1;
			ctx.fillRect(toScreen(gx, 0).x, 0, px, h);
		}
		for (let gy = y0; gy <= y1; gy++) {
			if (c < 5 && gy % 5) continue;
			ctx.globalAlpha = gy % 5 ? 0.5 : 1;
			ctx.fillRect(0, toScreen(0, gy).y, w, px);
		}
		ctx.globalAlpha = 1;
		const o = toScreen(0, 0);
		ctx.fillStyle = css.getPropertyValue('--muted').trim();
		ctx.globalAlpha = 0.4;
		ctx.beginPath();
		ctx.arc(o.x, o.y, 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
		for (const a of visible) {
			const p = a.placement!,
				s = toScreen(p.x, p.y);
			drawCells(ctx, a.project, s.x, s.y, c, dpr, a.bounds);
			if (a.id === hot) {
				ctx.strokeStyle = css.getPropertyValue('--primary').trim();
				ctx.lineWidth = 2;
				ctx.strokeRect(s.x - 3, s.y - 3, p.w * c + 6, p.h * c + 6);
			}
		}
	});

	// ---------- interaksi ----------
	const pointers = new Map<number, { x: number; y: number }>();
	let drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
	let pinch: { d: number; zoom: number } | null = null;

	const local = (e: PointerEvent | WheelEvent) => {
		const r = canvas!.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};
	function hit(x: number, y: number) {
		return visible.find((a) => {
			const p = a.placement!,
				s = toScreen(p.x, p.y);
			return x >= s.x && y >= s.y && x < s.x + p.w * cell && y < s.y + p.h * cell;
		});
	}
	function zoomAt(f: number, x = size.w / 2, y = size.h / 2) {
		const z = clamp(cam.zoom * f, 0.35, 3.2);
		const wx = cam.x + (x - size.w / 2) / cell,
			wy = cam.y + (y - size.h / 2) / cell;
		const nc = UNIT * z;
		cam = { zoom: z, x: wx - (x - size.w / 2) / nc, y: wy - (y - size.h / 2) / nc };
	}

	function down(e: PointerEvent) {
		canvas!.setPointerCapture(e.pointerId);
		const pt = local(e);
		pointers.set(e.pointerId, pt);
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: cam.zoom };
			drag = null;
			return;
		}
		drag = { x: pt.x, y: pt.y, cx: cam.x, cy: cam.y, moved: false };
	}
	function move(e: PointerEvent) {
		const pt = local(e);
		if (e.pointerType === 'mouse' && !drag) {
			const a = hit(pt.x, pt.y);
			hot = a?.id ?? null;
			tip = a ? { a, x: pt.x, y: pt.y } : null;
		}
		if (!pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, pt);
		if (pinch && pointers.size >= 2) {
			const [a, b] = [...pointers.values()];
			cam = { ...cam, zoom: clamp((pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d, 0.35, 3.2) };
			return;
		}
		if (!drag) return;
		if (Math.hypot(pt.x - drag.x, pt.y - drag.y) > 4) drag.moved = true; // FR-WORLD-05
		if (drag.moved) cam = { ...cam, x: drag.cx - (pt.x - drag.x) / cell, y: drag.cy - (pt.y - drag.y) / cell };
	}
	function up(e: PointerEvent) {
		pointers.delete(e.pointerId);
		if (pointers.size < 2) pinch = null;
		if (drag && !drag.moved && e.type === 'pointerup') {
			const a = hit(drag.x, drag.y);
			if (a) open(a);
		}
		if (!pointers.size) drag = null;
	}

	$effect(() => {
		const el = canvas;
		if (!el) return;
		const wheel = (e: WheelEvent) => {
			e.preventDefault();
			const pt = local(e);
			if (e.ctrlKey || e.metaKey) zoomAt(e.deltaY < 0 ? 1.1 : 0.9, pt.x, pt.y);
			else {
				const dx = e.shiftKey ? e.deltaY : e.deltaX,
					dy = e.shiftKey ? 0 : e.deltaY;
				cam = { ...cam, x: cam.x + dx / cell, y: cam.y + dy / cell };
			}
		};
		el.addEventListener('wheel', wheel, { passive: false });
		return () => el.removeEventListener('wheel', wheel);
	});

	function key(e: KeyboardEvent) {
		const d = (e.shiftKey ? 140 : 70) / cell;
		const moves: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
		if (e.key in moves) {
			e.preventDefault();
			const [dx, dy] = moves[e.key];
			cam = { ...cam, x: cam.x + dx, y: cam.y + dy };
		} else if (e.key === '+' || e.key === '=') zoomAt(1.2);
		else if (e.key === '-') zoomAt(1 / 1.2);
		else if (e.key === '0') frameAll();
	}

	// Detail selalu memvalidasi ulang ketersediaan publik (FR-WORLD-06).
	async function open(a: PublicArtwork) {
		detail = a;
		detailError = null;
		detailOpen = true;
		try {
			detail = await publicArtwork(a.id);
		} catch (e) {
			detailError = (e as ApiError).message;
		}
	}
</script>

<svelte:window bind:innerHeight={vh} />
<svelte:head><title>Canvas World · MIVUBI Canvas Pixel</title></svelte:head>

<div class="world-page">
	<SiteHeader current="world" floating />
	<div class="layout">
		<section class="viewport" aria-labelledby="world-title">
			<h1 id="world-title" class="visually-hidden">Canvas World</h1>
			<!-- Region World bisa difokus dan digeser dengan panah (T22). -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
			<div
				class="stage"
				bind:this={host}
				tabindex="0"
				role="application"
				aria-roledescription="peta karya"
				aria-label="Canvas World. Panah untuk menggeser, plus dan minus untuk zoom, 0 untuk melihat semua karya."
				onkeydown={key}
			>
				<canvas
					bind:this={canvas}
					aria-hidden="true"
					onpointerdown={down}
					onpointermove={move}
					onpointerup={up}
					onpointercancel={up}
					onpointerleave={() => ((hot = null), (tip = null))}
				></canvas>
				{#if tip}
					<div class="tip" style:left="{tip.x + 14}px" style:top="{tip.y + 14}px" aria-hidden="true">
						<strong>{displayTitle(tip.a.title)}</strong>
						<span>{displayCreator(tip.a.creatorName)}</span>
						<small>Klik untuk melihat karya</small>
					</div>
				{/if}
				{#if status === 'loading'}
					<p class="center-msg" role="status">Menyusun karya di Canvas World…</p>
				{:else if status === 'error'}
					<div class="center-msg banner" role="alert">
						<p>{loadError}</p>
						<button class="btn btn-secondary" onclick={load}>Coba lagi</button>
					</div>
				{:else if !items.length}
					<div class="center-msg">
						<p>Belum ada karya di area ini.</p>
						<a class="btn btn-primary" href="/">Mulai karya pertama</a>
					</div>
				{:else if !visible.length}
					<p class="center-msg">Belum ada karya di area ini. Pakai "Lihat semua" untuk kembali ke karya-karya.</p>
				{/if}
			</div>
			<div class="controls">
				<button class="btn btn-secondary btn-icon" aria-label="Perkecil" onclick={() => zoomAt(1 / 1.2)}>−</button>
				<span class="pct num">{Math.round(cam.zoom * 100)}%</span>
				<button class="btn btn-secondary btn-icon" aria-label="Perbesar" onclick={() => zoomAt(1.2)}>+</button>
				<button class="btn btn-secondary" onclick={frameAll}>Lihat semua</button>
			</div>
			<p class="gesture">Seret untuk menggeser · Ctrl + scroll atau cubit untuk zoom</p>
		</section>
	</div>
</div>

<Modal bind:open={detailOpen} wide label="Detail karya">
	{#if detail}
		<div class="dlg-body">
			{#if detailError}
				<h2>Karya tidak tersedia</h2>
				<p>{detailError}</p>
			{:else}
				<div>
					<h2>{displayTitle(detail.title)}</h2>
					<p class="muted">{[displayCreator(detail.creatorName), detail.socialHandle].filter(Boolean).join(' · ')}</p>
				</div>
				<div class="detail-board">
					<MiniBoard
						project={detail.project}
						bounds={detail.bounds}
						maxHeight={boardMax}
						label="Karya {displayTitle(detail.title)}"
					/>
				</div>
				<p class="muted num">{detail.project.columns} kolom × {detail.project.rows} baris · Area kosong transparan</p>
			{/if}
			<div class="dlg-actions">
				<button class="btn btn-secondary" onclick={() => (detailOpen = false)}>Tutup</button>
				{#if !detailError}<a class="btn btn-primary" href="/art/{detail.id}">Buka halaman karya</a>{/if}
			</div>
		</div>
	{/if}
</Modal>

<style>
	.world-page {
		position: relative;
		height: 100dvh;
		--header-fade: var(--section-blue);
	}
	.layout {
		height: 100%;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}
	.viewport {
		position: relative;
		min-height: 0;
		background: var(--section-blue);
	}
	.stage {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	.stage:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: -4px;
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
		cursor: grab;
	}
	.tip {
		position: absolute;
		display: grid;
		gap: 2px;
		padding: 8px 12px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-panel);
		pointer-events: none;
		font-size: var(--text-sm);
		max-width: 240px;
	}
	.tip small {
		color: var(--muted);
	}
	.center-msg {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		display: grid;
		gap: 12px;
		justify-items: center;
		text-align: center;
		padding: 16px 20px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		max-width: min(420px, 90%);
	}
	.controls {
		position: absolute;
		left: 16px;
		bottom: 16px;
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.controls .btn-icon {
		font-size: 22px;
		font-weight: 600;
	}
	.pct {
		min-width: 56px;
		text-align: center;
		font-weight: 600;
		font-size: var(--text-sm);
		line-height: 44px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
	}
	.gesture {
		position: absolute;
		right: 16px;
		bottom: 22px;
		font-size: var(--text-sm);
		color: var(--muted);
		background: var(--bg);
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--line);
	}
	.detail-board {
		padding: 16px;
		background: var(--section-blue);
		border-radius: var(--radius-md);
		display: grid;
		place-items: center;
	}
	.detail-board :global(.mini) {
		max-width: 520px;
	}
	@media (max-width: 800px) {
		.gesture {
			display: none;
		}
	}
</style>
