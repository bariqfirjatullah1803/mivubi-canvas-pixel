<script lang="ts">
	// Pengaturan pameran: Canvas, Palet, Gap World (PRD FR-SET, DESIGN §13).
	import { canvasError, gridOf } from '$lib/grid';
	import { getSettings, parsePaletteText, saveCanvasSettings, saveGap, savePalette, type ApiError, type Settings } from '$lib/store';

	let settings: Settings | null = $state(null);
	let widthCm = $state(240);
	let heightCm = $state(120);
	let cellCm = $state(5);
	// Palet disunting sebagai baris; teksnya hanya format kirim ke store (validasi tetap satu tempat).
	type Row = { hex: string; name: string };
	let rows: Row[] = $state([]);
	let gap = $state(4);
	let msg: Record<string, { ok: boolean; text: string } | undefined> = $state({});

	async function load() {
		const s = await getSettings();
		settings = s;
		widthCm = s.canvas.widthMm / 10;
		heightCm = s.canvas.heightMm / 10;
		cellCm = s.canvas.cellMm / 10;
		rows = s.palette.map((c) => ({ hex: c.hex.toUpperCase(), name: c.name ?? '' }));
		gap = s.gap;
	}
	$effect(() => {
		load();
	});

	const canvasCheck = $derived.by(() => {
		const c = { widthMm: Math.round(widthCm * 10), heightMm: Math.round(heightCm * 10), cellMm: Math.round(cellCm * 10) };
		return { err: canvasError(c), ...gridOf(c) };
	});
	const paletteText = $derived(rows.map((r) => `${r.hex} | ${r.name}`.trim()).join('\n'));
	const paletteCheck = $derived.by(() => {
		try {
			parsePaletteText(paletteText);
			return { err: null, badRow: -1 };
		} catch (e) {
			const err = (e as ApiError).message;
			return { err, badRow: Number(/^Baris (\d+)/.exec(err)?.[1] ?? 0) - 1 };
		}
	});

	/** `<input type="color">` hanya menerima #rrggbb. */
	function swatchValue(hex: string) {
		const h = hex.trim().replace('#', '');
		if (/^[0-9a-fA-F]{3}$/.test(h))
			return (
				'#' +
				[...h]
					.map((c) => c + c)
					.join('')
					.toLowerCase()
			);
		return /^[0-9a-fA-F]{6}$/.test(h) ? `#${h.toLowerCase()}` : '#000000';
	}
	function move(i: number, by: number) {
		const j = i + by;
		if (j < 0 || j >= rows.length) return;
		[rows[i], rows[j]] = [rows[j], rows[i]];
	}

	async function run(key: string, fn: () => Promise<unknown>, ok: string) {
		msg[key] = undefined;
		try {
			await fn();
			msg[key] = { ok: true, text: ok };
			await load();
		} catch (e) {
			msg[key] = { ok: false, text: (e as ApiError).message };
		}
	}
</script>

<svelte:head><title>Pengaturan · Admin MIVUBI</title></svelte:head>

<header class="head">
	<h1>Pengaturan pameran</h1>
	<p class="muted">Setiap perubahan hanya berlaku untuk karya baru. Karya lama menyimpan ukuran dan paletnya sendiri, jadi mengubah nilai di sini tidak merusak apa pun yang sudah tersimpan.</p>
</header>

{#if settings}
	<div class="cards">
		<form
			class="panel canvas"
			onsubmit={(e) => {
				e.preventDefault();
				run('canvas', () => saveCanvasSettings(widthCm, heightCm, cellCm), 'Pengaturan Canvas tersimpan untuk karya baru.');
			}}
		>
			<div class="panel-head">
				<h2>Canvas</h2>
				<p class="muted">Ukuran papan fisik dan besar satu blok. Grid dihitung otomatis.</p>
			</div>
			<div class="body">
			<div class="three">
				<div class="field"><label for="c-w">Lebar (cm)</label><input id="c-w" type="number" step="0.1" min="0.1" bind:value={widthCm} /></div>
				<div class="field"><label for="c-h">Tinggi (cm)</label><input id="c-h" type="number" step="0.1" min="0.1" bind:value={heightCm} /></div>
				<div class="field"><label for="c-s">Ukuran sel (cm)</label><input id="c-s" type="number" step="0.1" min="0.1" bind:value={cellCm} /></div>
			</div>
			<p class="check" class:bad={!!canvasCheck.err} aria-live="polite">
				{#if canvasCheck.err}{canvasCheck.err}{:else}Ukuran grid <strong class="num">{canvasCheck.columns} × {canvasCheck.rows}</strong> · Total
					<strong class="num">{(canvasCheck.columns * canvasCheck.rows).toLocaleString('id-ID')}</strong> sel{/if}
			</p>
			</div>
			<div class="foot">
				<button class="btn btn-primary" disabled={!!canvasCheck.err}>Simpan Canvas</button>
				{#if msg.canvas}<p class={msg.canvas.ok ? 'ok' : 'err'} role={msg.canvas.ok ? 'status' : 'alert'}>{msg.canvas.text}</p>{/if}
			</div>
		</form>

		<form
			class="panel palette"
			onsubmit={(e) => {
				e.preventDefault();
				run('palette', () => savePalette(paletteText), 'Palet tersimpan. Karya lama tidak berubah.');
			}}
		>
			<div class="panel-head">
				<h2>Palet blok</h2>
				<p class="muted">Warna yang tersedia di rak Studio. Pengunjung tidak bisa menambah warna sendiri.</p>
			</div>
			<div class="body">
				<p class="help" id="p-help">
					1–32 warna. Nomor slot mengikuti urutan di bawah, dan nomor itulah yang tampil di rak Studio. Warna yang sama tidak boleh
					muncul dua kali.
				</p>

				<ol class="rows" aria-describedby="p-help">
					{#each rows as row, i (i)}
						<li class="crow" class:bad={paletteCheck.badRow === i}>
							<span class="slot num" aria-hidden="true">{i + 1}</span>
							<input
								class="dot"
								type="color"
								value={swatchValue(row.hex)}
								aria-label="Warna slot {i + 1}"
								oninput={(e) => (rows[i].hex = e.currentTarget.value.toUpperCase())}
							/>
							<input
								class="hex num"
								bind:value={rows[i].hex}
								spellcheck="false"
								maxlength="7"
								aria-label="Kode HEX slot {i + 1}"
								placeholder="#101418"
							/>
							<input class="nm" bind:value={rows[i].name} maxlength="80" aria-label="Nama warna slot {i + 1}" placeholder="Nama warna" />
							<div class="ops">
								<button type="button" class="icon" aria-label="Naikkan slot {i + 1}" disabled={i === 0} onclick={() => move(i, -1)}>↑</button>
								<button
									type="button"
									class="icon"
									aria-label="Turunkan slot {i + 1}"
									disabled={i === rows.length - 1}
									onclick={() => move(i, 1)}>↓</button
								>
								<button
									type="button"
									class="icon del"
									aria-label="Hapus slot {i + 1}"
									disabled={rows.length < 2}
									onclick={() => rows.splice(i, 1)}>✕</button
								>
							</div>
						</li>
					{/each}
				</ol>

				<button type="button" class="btn btn-secondary" disabled={rows.length >= 32} onclick={() => rows.push({ hex: '#000000', name: '' })}>
					+ Tambah warna
				</button>
				{#if paletteCheck.err}<p class="err" role="alert">{paletteCheck.err}</p>{/if}
			</div>
			<div class="foot">
				<button class="btn btn-primary" disabled={!!paletteCheck.err}>Simpan palet</button>
				<span class="muted count num">{rows.length} dari 32 warna</span>
				{#if msg.palette}<p class={msg.palette.ok ? 'ok' : 'err'} role={msg.palette.ok ? 'status' : 'alert'}>{msg.palette.text}</p>{/if}
			</div>
		</form>

		<form
			class="panel gap"
			onsubmit={(e) => {
				e.preventDefault();
				run('gap', () => saveGap(Number(gap)), 'Gap World tersimpan untuk penempatan berikutnya.');
			}}
		>
			<div class="panel-head">
				<h2>Gap Canvas World</h2>
				<p class="muted">Jarak kosong yang dijaga saat karya baru ditempatkan di World.</p>
			</div>
			<div class="body">
			<div class="field">
				<label for="g">Jarak minimum antar karya (sel)</label>
				<input id="g" type="number" min="0" max="256" step="1" bind:value={gap} aria-describedby="g-help" />
				<span class="help" id="g-help">0–256. Karya yang sudah tampil tidak dipindah.</span>
			</div>
			</div>
			<div class="foot">
				<button class="btn btn-primary">Simpan gap</button>
				{#if msg.gap}<p class={msg.gap.ok ? 'ok' : 'err'} role={msg.gap.ok ? 'status' : 'alert'}>{msg.gap.text}</p>{/if}
			</div>
		</form>
	</div>
{/if}

<style>
	.head p {
		max-width: 68ch;
		margin-top: 4px;
	}
	.cards {
		display: grid;
		gap: 20px;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		/* Baris ketiga menyerap sisa tinggi palet, supaya Gap tetap menempel di bawah Canvas. */
		grid-template-rows: auto auto 1fr;
		align-items: start;
	}
	.canvas {
		grid-area: 1 / 1;
	}
	.gap {
		grid-area: 2 / 1;
	}
	/* Palet butuh ruang vertikal paling banyak, jadi ia memegang satu kolom penuh. */
	.palette {
		grid-column: 2;
		grid-row: 1 / -1;
	}
	.panel {
		display: grid;
		grid-template-rows: auto 1fr auto;
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.panel-head {
		padding: 14px 20px;
		border-bottom: 1px solid var(--line);
	}
	.panel-head p {
		font-size: var(--text-sm);
		margin-top: 2px;
	}
	.body {
		display: grid;
		gap: 16px;
		align-content: start;
		padding: 20px;
	}
	.foot {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding: 14px 20px;
		border-top: 1px solid var(--line);
		background: var(--section-green);
	}
	h2 {
		font-size: var(--text-md);
		font-weight: 600;
	}
	.three {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}
	.check {
		font-size: var(--text-sm);
	}
	.check.bad,
	.err {
		color: var(--danger);
		font-weight: 500;
	}
	.ok {
		color: var(--primary);
		font-weight: 500;
	}
	/* Satu baris per slot: nomor, swatch, HEX, nama, lalu operasi urutan/hapus. */
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.crow {
		display: grid;
		grid-template-columns: 24px 44px 96px minmax(0, 1fr) auto;
		gap: 8px;
		align-items: center;
	}
	.crow.bad .hex {
		border: 2px solid var(--danger);
	}
	.slot {
		font-size: var(--text-sm);
		color: var(--muted);
		text-align: right;
	}
	.crow input {
		min-height: 40px;
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-sm);
	}
	.crow .hex,
	.crow .nm {
		min-width: 0;
		padding: 0 10px;
	}
	.dot {
		width: 44px;
		padding: 3px;
		cursor: pointer;
	}
	.dot::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.dot::-webkit-color-swatch {
		border: 0;
		border-radius: 4px;
	}
	.ops {
		display: flex;
		gap: 2px;
	}
	.icon {
		width: 32px;
		height: 40px;
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--ink);
		font: inherit;
		line-height: 1;
		cursor: pointer;
	}
	.icon:hover:not(:disabled) {
		background: var(--highlight);
	}
	.icon.del:hover:not(:disabled) {
		background: var(--danger);
		color: var(--on-primary);
		border-color: var(--danger);
	}
	.icon:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.count {
		font-size: var(--text-sm);
	}
	@media (max-width: 1000px) {
		.cards {
			grid-template-columns: 1fr;
		}
		.canvas,
		.gap,
		.palette {
			grid-area: auto;
		}
	}
	/* Dua tingkat: nomor + swatch + HEX + operasi, lalu nama di bawahnya. */
	@media (max-width: 560px) {
		.crow {
			grid-template-columns: 22px 40px minmax(0, 1fr) auto;
			gap: 6px;
			padding-bottom: 10px;
			border-bottom: 1px solid var(--line);
		}
		.crow .nm {
			grid-column: 2 / -1;
			grid-row: 2;
		}
		.ops {
			grid-column: 4;
			grid-row: 1;
		}
		.dot {
			width: 40px;
		}
		.icon {
			width: 30px;
		}
	}
	@media (max-width: 400px) {
		.crow {
			grid-template-columns: 18px 36px minmax(0, 1fr) auto;
			gap: 4px;
		}
		.dot {
			width: 36px;
		}
		.icon {
			width: 26px;
		}
		.crow .hex {
			padding: 0 6px;
			font-size: 13px;
		}
	}
	@media (max-width: 500px) {
		.three {
			grid-template-columns: 1fr;
		}
	}
</style>
