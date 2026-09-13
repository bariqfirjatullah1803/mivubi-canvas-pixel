<script lang="ts">
	// Pola referensi sebagai petak DOM: dipakai untuk pratinjau (Admin, Studio) dan
	// untuk menggambar (Admin). Tidak memakai kanvas karena polanya kecil dan,
	// saat digambar, tiap sel perlu bisa dicapai keyboard.
	let {
		rows,
		colors,
		max = 160,
		label,
		paint
	}: {
		rows: string[];
		colors: Record<string, string>;
		max?: number;
		label?: string;
		paint?: (x: number, y: number) => void;
	} = $props();

	const w = $derived(rows[0]?.length ?? 0);
	const cell = $derived(Math.max(4, Math.floor(max / Math.max(w, rows.length, 1))));
	const name = $derived(label ?? `Pola ${w} × ${rows.length} sel`);

	let down = $state(false);

	$effect(() => {
		if (!paint) return;
		const up = () => (down = false);
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', up);
		return () => {
			window.removeEventListener('pointerup', up);
			window.removeEventListener('pointercancel', up);
		};
	});

	function start(x: number, y: number, e: PointerEvent) {
		if (!paint || e.button > 0) return;
		down = true;
		paint(x, y);
	}
</script>

<div class="tg" class:paintable={!!paint} style:--c="{cell}px" style:--w={w} role={paint ? 'group' : 'img'} aria-label={name}>
	{#each rows as line, y (y)}
		{#each line.split('') as ch, x (x)}
			{@const fill = ch === '.' ? null : colors[ch]}
			{#if paint}
				<button
					type="button"
					class="c"
					style:background={fill ?? 'transparent'}
					aria-label="Sel {x + 1}, {y + 1}"
					aria-pressed={!!fill}
					onpointerdown={(e) => start(x, y, e)}
					onpointerenter={() => down && paint(x, y)}
					onclick={() => paint(x, y)}
				></button>
			{:else}
				<span class="c" style:background={fill ?? 'transparent'}></span>
			{/if}
		{/each}
	{/each}
</div>

<style>
	.tg {
		--checker: color-mix(in srgb, var(--line) 55%, transparent);
		display: grid;
		grid-template-columns: repeat(var(--w), var(--c));
		width: max-content;
		max-width: 100%;
		/* Kotak-kotak halus di belakang sel kosong: menandai pola, bukan gambar transparan. */
		background:
			linear-gradient(45deg, var(--checker) 25%, transparent 25% 75%, var(--checker) 75%) 0 0 / calc(var(--c) * 2) calc(var(--c) * 2),
			linear-gradient(45deg, var(--checker) 25%, transparent 25% 75%, var(--checker) 75%) var(--c) var(--c) / calc(var(--c) * 2)
				calc(var(--c) * 2),
			var(--board-ivory);
		border: var(--outline-thin);
		border-radius: var(--radius-xs);
	}
	.c {
		width: var(--c);
		height: var(--c);
		padding: 0;
		border: 0;
	}
	.paintable .c {
		cursor: crosshair;
		touch-action: none;
	}
	.paintable .c:hover {
		box-shadow: inset 0 0 0 1px var(--outline);
	}
	.paintable .c:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}
</style>
