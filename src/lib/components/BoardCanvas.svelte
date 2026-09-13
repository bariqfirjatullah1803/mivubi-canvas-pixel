<script module lang="ts">
	export type Tool = 'pencil' | 'eraser' | 'pan';
	export type Stroke = { idx: number[]; before: number[]; after: number[]; tool: 'pencil' | 'eraser' };
</script>

<script lang="ts">
	// Papan editor: pan/zoom, goresan pointer/sentuh, keyboard (PRD §9.3 FR-CANVAS).
	import { untrack } from 'svelte';
	import { EMPTY, linePoints, type Project } from '$lib/grid';
	import { drawCells, drawFrame, drawGridLines, fitCanvas } from '$lib/render';

	let {
		project,
		version = 0,
		editable = true,
		tool = 'pencil',
		slot = 0,
		showGrid = true,
		insetTop = 0,
		insetBottom = 0,
		zoom = $bindable(1),
		onstroke,
		label
	}: {
		project: Project;
		version?: number;
		editable?: boolean;
		tool?: Tool;
		slot?: number;
		showGrid?: boolean;
		insetTop?: number;
		insetBottom?: number;
		zoom?: number;
		onstroke?: (s: Stroke) => void;
		label?: string;
	} = $props();

	const FRAME = 22;
	const PAD = 14;
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

	let host: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let size = $state({ w: 0, h: 0 });
	let fitCell = $state(10);
	let pan = $state({ x: 0, y: 0 });
	type Pt = { x: number; y: number };
	let hover = $state<Pt | null>(null);
	let cursor = $state<Pt | null>(null);
	let keyboard = $state(false);
	// Fokus papan diberikan lewat script saat pointer turun. Kalau interaksi terakhir pengguna
	// adalah tombol keyboard, browser menilai fokus itu "keyboard" dan memunculkan cincin fokus
	// di tengah menggambar. Tandai asal fokusnya supaya cincin hanya tampil untuk keyboard.
	let pointerFocus = $state(false);
	let tick = $state(0);

	const cols = $derived(project.columns);
	const rows = $derived(project.rows);
	const cell = $derived(Math.max(2, fitCell * zoom));
	const shown = $derived(keyboard ? cursor : hover);

	const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

	/**
	 * Papan tidak boleh digeser keluar dari area editor.
	 * Kalau papan lebih kecil dari area, ia bebas bergerak tetapi tetap utuh di dalam;
	 * kalau lebih besar, tepinya berhenti di tepi area sehingga selalu ada papan yang terlihat.
	 */
	function clampPan(p: Pt, c = cell): Pt {
		if (!size.w || !size.h) return p;
		const bw = c * cols + FRAME * 2,
			bh = c * rows + FRAME * 2;
		const slackX = size.w - bw,
			slackY = size.h - insetTop - insetBottom - bh;
		return {
			x: clamp(p.x - FRAME, Math.min(0, slackX), Math.max(0, slackX)) + FRAME,
			y: clamp(p.y - FRAME - insetTop, Math.min(0, slackY), Math.max(0, slackY)) + FRAME + insetTop
		};
	}

	function center() {
		const c = Math.max(2, fitCell * zoom);
		pan = { x: (size.w - c * cols) / 2, y: insetTop + (size.h - insetTop - insetBottom - c * rows) / 2 };
	}

	export function fit() {
		if (!size.w || !size.h) return;
		const availW = size.w - 2 * (PAD + FRAME);
		const availH = size.h - insetTop - insetBottom - 2 * (PAD + FRAME);
		fitCell = Math.min(34, Math.max(3, Math.min(availW / cols, availH / rows)));
		zoom = 1;
		center();
	}

	export function zoomBy(f: number, px = size.w / 2, py = insetTop + (size.h - insetTop - insetBottom) / 2) {
		const z = clamp(zoom * f, 0.6, 7);
		const old = Math.max(2, fitCell * zoom),
			next = Math.max(2, fitCell * z);
		pan = clampPan({ x: px - ((px - pan.x) * next) / old, y: py - ((py - pan.y) * next) / old }, next);
		zoom = z;
	}

	/** Kotak luar papan (termasuk bingkai) dalam koordinat viewport. */
	export function boardRect() {
		const r = canvas!.getBoundingClientRect();
		return new DOMRect(r.left + pan.x - FRAME, r.top + pan.y - FRAME, cell * cols + FRAME * 2, cell * rows + FRAME * 2);
	}

	$effect(() => {
		if (!host) return;
		const ro = new ResizeObserver(([e]) => {
			size = { w: e.contentRect.width, h: e.contentRect.height };
			pan = clampPan(pan);
		});
		ro.observe(host);
		return () => ro.disconnect();
	});

	let fittedFor = '';
	$effect(() => {
		const key = `${project.id}:${size.w}x${size.h}:${insetTop}:${insetBottom}`;
		if (!size.w) return;
		untrack(() => {
			const sameProject = fittedFor.startsWith(project.id + ':');
			if (!sameProject || zoom === 1) fit();
			fittedFor = key;
		});
	});

	// ---------- gambar ----------
	const settle = new Map<number, number>();
	let raf = 0;
	function runSettle() {
		if (raf || !settle.size) return;
		const loop = () => {
			const now = performance.now();
			for (const [i, t] of settle) if (now - t > 160) settle.delete(i);
			tick++;
			raf = settle.size ? requestAnimationFrame(loop) : 0;
		};
		raf = requestAnimationFrame(loop);
	}

	$effect(() => {
		void version;
		void tick;
		const c = cell,
			p = pan,
			{ w, h } = size;
		if (!w || !h || !canvas) return;
		const { ctx, dpr } = fitCanvas(canvas, w, h);
		drawFrame(ctx, p.x, p.y, c * cols, c * rows, FRAME);
		drawCells(ctx, project, p.x, p.y, c, dpr);
		if (showGrid) drawGridLines(ctx, p.x, p.y, cols, rows, c, dpr);
		const now = performance.now();
		for (const [i, t] of settle) {
			ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - (now - t) / 160)})`;
			ctx.fillRect(p.x + (i % cols) * c, p.y + Math.floor(i / cols) * c, c, c);
		}
		if (hover && !keyboard && editable && tool !== 'pan') {
			const x = p.x + hover.x * c,
				y = p.y + hover.y * c;
			ctx.globalAlpha = 0.65;
			ctx.fillStyle = tool === 'eraser' ? '#FEFAEC' : (project.palette[slot]?.hex ?? '#FEFAEC');
			ctx.fillRect(x, y, c, c);
			ctx.globalAlpha = 1;
			ctx.strokeStyle = '#08783F';
			ctx.lineWidth = 2;
			ctx.strokeRect(x + 1, y + 1, c - 2, c - 2);
		}
		if (keyboard && cursor) {
			const x = p.x + cursor.x * c,
				y = p.y + cursor.y * c;
			ctx.lineWidth = 2;
			ctx.strokeStyle = '#FFFEF5';
			ctx.strokeRect(x + 1, y + 1, c - 2, c - 2);
			ctx.lineWidth = 3;
			ctx.strokeStyle = '#08783F';
			ctx.strokeRect(x - 1.5, y - 1.5, c + 3, c + 3);
		}
	});

	// ---------- goresan ----------
	let stroke: { map: Map<number, [number, number]>; last: [number, number] | null; tool: 'pencil' | 'eraser' } | null = null;

	function paint(cx: number, cy: number) {
		if (!stroke) return;
		const pts = stroke.last ? linePoints(stroke.last[0], stroke.last[1], cx, cy) : [[cx, cy] as [number, number]];
		stroke.last = [cx, cy];
		const v = stroke.tool === 'eraser' ? EMPTY : slot;
		for (const [x, y] of pts) {
			const i = y * cols + x;
			const cur = project.cells[i];
			if (cur === v) continue;
			const rec = stroke.map.get(i);
			if (rec) rec[1] = v;
			else stroke.map.set(i, [cur, v]);
			project.cells[i] = v;
			if (v !== EMPTY && !reduced) settle.set(i, performance.now());
		}
		tick++;
		runSettle();
	}

	function begin(t: 'pencil' | 'eraser') {
		stroke = { map: new Map(), last: null, tool: t };
	}

	function endStroke() {
		if (!stroke) return;
		const s = stroke;
		stroke = null;
		const out: Stroke = { idx: [], before: [], after: [], tool: s.tool };
		for (const [i, [b, a]] of s.map)
			if (b !== a) {
				out.idx.push(i);
				out.before.push(b);
				out.after.push(a);
			}
		if (out.idx.length) onstroke?.(out);
	}

	// ---------- pointer ----------
	const pointers = new Map<number, { x: number; y: number }>();
	let tap: { id: number; x: number; y: number } | null = null;
	let drag: { id: number; x: number; y: number; px: number; py: number } | null = null;
	let pinch: { d: number; zoom: number; mx: number; my: number; px: number; py: number } | null = null;

	const local = (e: PointerEvent) => {
		const r = canvas!.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};
	function cellAt(x: number, y: number): [number, number] | null {
		const cx = Math.floor((x - pan.x) / cell),
			cy = Math.floor((y - pan.y) / cell);
		return cx >= 0 && cy >= 0 && cx < cols && cy < rows ? [cx, cy] : null;
	}
	const toolNow = (): 'pencil' | 'eraser' => (tool === 'eraser' ? 'eraser' : 'pencil');

	function down(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
		pointerFocus = true;
		host!.focus({ preventScroll: true });
		keyboard = false;
		canvas!.setPointerCapture(e.pointerId);
		const pt = local(e);
		pointers.set(e.pointerId, pt);
		if (pointers.size === 2) {
			// Dua jari = geser + zoom, tidak pernah menggambar (PRD F3, AC-05).
			endStroke();
			tap = null;
			drag = null;
			const [a, b] = [...pointers.values()];
			pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, px: pan.x, py: pan.y };
			return;
		}
		if (pointers.size > 2) return;
		if (tool === 'pan' || e.button === 1 || !editable) {
			e.preventDefault();
			drag = { id: e.pointerId, x: pt.x, y: pt.y, px: pan.x, py: pan.y };
			return;
		}
		if (e.pointerType === 'touch') {
			tap = { id: e.pointerId, ...pt };
			return;
		}
		const c = cellAt(pt.x, pt.y);
		if (!c) return;
		begin(toolNow());
		paint(...c);
	}

	function move(e: PointerEvent) {
		const pt = local(e);
		if (e.pointerType !== 'touch') {
			const h = editable && tool !== 'pan' ? cellAt(pt.x, pt.y) : null;
			hover = h ? { x: h[0], y: h[1] } : null;
		}
		if (!pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, pt);
		if (pinch && pointers.size >= 2) {
			const [a, b] = [...pointers.values()];
			const z = clamp((pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d, 0.6, 7);
			const mx = (a.x + b.x) / 2,
				my = (a.y + b.y) / 2;
			const old = Math.max(2, fitCell * pinch.zoom),
				next = Math.max(2, fitCell * z);
			pan = clampPan({ x: mx - ((pinch.mx - pinch.px) * next) / old, y: my - ((pinch.my - pinch.py) * next) / old }, next);
			zoom = z;
			return;
		}
		if (drag && drag.id === e.pointerId) {
			pan = clampPan({ x: drag.px + pt.x - drag.x, y: drag.py + pt.y - drag.y });
			return;
		}
		if (tap && tap.id === e.pointerId) {
			if (Math.hypot(pt.x - tap.x, pt.y - tap.y) < 4) return;
			const c0 = cellAt(tap.x, tap.y);
			tap = null;
			begin(toolNow());
			if (c0) paint(...c0);
		}
		if (stroke) {
			const c = cellAt(pt.x, pt.y);
			if (c) paint(...c);
			else stroke.last = null;
		}
	}

	function up(e: PointerEvent) {
		const t = tap && tap.id === e.pointerId && e.type === 'pointerup' ? tap : null;
		pointers.delete(e.pointerId);
		if (t) {
			const c = cellAt(t.x, t.y);
			if (c) {
				begin(toolNow());
				paint(...c);
			}
		}
		tap = null;
		if (pointers.size < 2) pinch = null;
		if (drag?.id === e.pointerId) drag = null;
		if (pointers.size === 0) endStroke();
	}

	$effect(() => {
		const el = canvas;
		if (!el) return;
		const wheel = (e: WheelEvent) => {
			e.preventDefault();
			const r = el.getBoundingClientRect();
			if (e.ctrlKey || e.metaKey) zoomBy(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - r.left, e.clientY - r.top);
			else {
				const dx = e.shiftKey ? e.deltaY : e.deltaX,
					dy = e.shiftKey ? 0 : e.deltaY;
				pan = clampPan({ x: pan.x - dx, y: pan.y - dy });
			}
		};
		el.addEventListener('wheel', wheel, { passive: false });
		return () => el.removeEventListener('wheel', wheel);
	});

	// ---------- keyboard (FR-CANVAS-11) ----------
	const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

	function applyAtCursor(t: 'pencil' | 'eraser') {
		const c = cursor ?? { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
		cursor = c;
		begin(t);
		paint(c.x, c.y);
		endStroke();
	}

	function key(e: KeyboardEvent) {
		pointerFocus = false;
		if (e.altKey || e.isComposing) return;
		const k = e.key;
		if (k in ARROWS) {
			e.preventDefault();
			const [dx, dy] = ARROWS[k];
			if (tool === 'pan' || !editable) {
				pan = clampPan({ x: pan.x - dx * 64, y: pan.y - dy * 64 });
				return;
			}
			keyboard = true;
			const c = cursor ?? { x: Math.floor(cols / 2) - dx, y: Math.floor(rows / 2) - dy };
			cursor = { x: clamp(c.x + dx, 0, cols - 1), y: clamp(c.y + dy, 0, rows - 1) };
		} else if ((k === 'Enter' || k === ' ') && editable && tool !== 'pan') {
			e.preventDefault();
			keyboard = true;
			applyAtCursor(toolNow());
		} else if ((k === 'Delete' || k === 'Backspace') && editable) {
			e.preventDefault();
			keyboard = true;
			applyAtCursor('eraser');
		} else if (k === '+' || k === '=') {
			e.preventDefault();
			zoomBy(1.15);
		} else if (k === '-') {
			e.preventDefault();
			zoomBy(1 / 1.15);
		} else if (k === '0') {
			e.preventDefault();
			fit();
		}
	}
</script>

<!-- Papan adalah widget keyboard (role application), jadi tabindex dan keydown memang disengaja. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	class="board"
	bind:this={host}
	tabindex="0"
	role="application"
	aria-roledescription="papan"
	aria-label={label ??
		`Papan ${cols} kolom × ${rows} baris. Panah memilih sel, Enter memasang blok, Delete menghapus, plus dan minus untuk zoom, 0 untuk Fit.`}
	aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space Delete + - 0"
	class:quiet={pointerFocus}
	onkeydown={key}
	onblur={() => ((keyboard = false), (pointerFocus = false))}
>
	<canvas
		bind:this={canvas}
		class:pan={tool === 'pan' || !editable}
		aria-hidden="true"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onpointerleave={() => (hover = null)}
	></canvas>
	{#if shown}
		<p class="coord num" style:bottom="{insetBottom + 8}px" aria-hidden="true">
			Kolom {shown.x + 1} · Baris {shown.y + 1}{#if keyboard}<span class="kbd">Keyboard</span>{/if}
		</p>
	{/if}
</div>

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
		touch-action: none;
		cursor: crosshair;
	}
	canvas.pan {
		cursor: grab;
	}
	.board:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: -6px;
	}
	/* Fokus datang dari klik atau sentuhan di papan: tidak perlu cincin. */
	.board.quiet:focus-visible {
		outline: none;
	}
	.coord {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		margin: 0;
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		background: var(--bg);
		border: var(--outline-thin);
		font-size: var(--text-xs);
		font-weight: 500;
		pointer-events: none;
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.kbd {
		padding: 0 6px;
		border-radius: var(--radius-xs);
		background: var(--highlight);
	}
</style>
