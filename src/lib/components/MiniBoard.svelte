<script lang="ts">
	import type { Bounds, Project } from '$lib/grid';
	import { drawCells, drawFrame, drawGridLines, fitCanvas } from '$lib/render';

	// maxHeight membatasi tinggi papan mini. Tanpa itu tinggi hanya mengikuti lebar wadah,
	// sehingga karya yang tinggi-ramping meluber jauh melewati layar.
	let {
		project,
		bounds,
		label,
		grid = false,
		maxHeight
	}: { project: Project; bounds?: Bounds | null; label: string; grid?: boolean; maxHeight?: number } = $props();

	let w = $state(0);
	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		if (!w || !canvas) return;
		const cols = bounds ? bounds.maxX - bounds.minX + 1 : project.columns;
		const rows = bounds ? bounds.maxY - bounds.minY + 1 : project.rows;
		const limit = maxHeight ?? Infinity;
		const frame = Math.max(4, Math.round(Math.min(w, limit) * 0.03));
		const cell = Math.min((w - frame * 2) / cols, (limit - frame * 2) / rows);
		if (!(cell > 0)) return;
		const bw = Math.round(cell * cols + frame * 2),
			bh = Math.round(cell * rows + frame * 2);
		canvas.style.width = `${bw}px`;
		canvas.style.height = `${bh}px`;
		const { ctx, dpr } = fitCanvas(canvas, bw, bh);
		drawFrame(ctx, frame, frame, cell * cols, cell * rows, frame);
		if (grid) drawGridLines(ctx, frame, frame, cols, rows, cell, dpr);
		drawCells(ctx, project, frame, frame, cell, dpr, bounds ?? undefined);
	});
</script>

<div class="mini" bind:clientWidth={w}>
	<div role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'}>
		<canvas bind:this={canvas} aria-hidden="true"></canvas>
	</div>
</div>

<style>
	.mini {
		width: 100%;
	}
	canvas {
		display: block;
		margin: 0 auto;
		max-width: 100%;
	}
</style>
