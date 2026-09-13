<script lang="ts">
	// Referensi pola: Admin menggambar pola kecil yang bisa ditempel user di Studio (DESIGN §13.5).
	import Modal from '$lib/components/Modal.svelte';
	import TemplateGrid from '$lib/components/TemplateGrid.svelte';
	import { SYMBOLS, templateSize, type SiteColor, type Template } from '$lib/grid';
	import { deleteTemplate, getSettings, listTemplates, saveTemplate, type ApiError } from '$lib/store';
	import { toast } from '$lib/ui.svelte';

	type Draft = { id: string; name: string; rows: string[]; colors: Record<string, string> };

	const MIN = 4;
	const MAX = 32;

	let list: Template[] = $state([]);
	let palette: SiteColor[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let draft = $state<Draft | null>(null);
	let editOpen = $state(false);
	let delOpen = $state(false);
	let pen = $state(0); // -1 = penghapus
	let formError = $state<string | null>(null);
	let busy = $state(false);
	let doomed = $state<Template | null>(null);
	let vw = $state(1280);

	// Petak gambar ikut lebar layar: di ponsel 360 px membuat dialog ikut bergeser.
	const editMax = $derived(Math.min(360, Math.max(160, vw - 120)));
	const size = $derived(draft ? { w: draft.rows[0]?.length ?? 0, h: draft.rows.length } : { w: 0, h: 0 });
	const filled = $derived(draft ? [...draft.rows.join('')].filter((c) => c !== '.').length : 0);

	async function load() {
		loading = true;
		try {
			[list, palette] = await Promise.all([listTemplates(), getSettings().then((s) => s.palette)]);
			error = null;
		} catch (e) {
			error = (e as ApiError).message;
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		load();
	});

	const blank = (w: number, h: number) => Array.from({ length: h }, () => '.'.repeat(w));

	function create() {
		draft = { id: '', name: '', rows: blank(12, 12), colors: {} };
		pen = 0;
		formError = null;
		editOpen = true;
	}

	function edit(t: Template) {
		draft = { id: t.id, name: t.name, rows: [...t.rows], colors: { ...t.colors } };
		pen = 0;
		formError = null;
		editOpen = true;
	}

	function resize(w: number, h: number) {
		if (!draft) return;
		const nw = Math.min(MAX, Math.max(MIN, Math.round(w) || MIN));
		const nh = Math.min(MAX, Math.max(MIN, Math.round(h) || MIN));
		draft.rows = Array.from({ length: nh }, (_, y) => ((draft!.rows[y] ?? '') + '.'.repeat(nw)).slice(0, nw));
	}

	function paint(x: number, y: number) {
		if (!draft) return;
		const ch = pen < 0 ? '.' : SYMBOLS[pen];
		const line = draft.rows[y];
		if (!line || line[x] === ch) return;
		draft.rows[y] = line.slice(0, x) + ch + line.slice(x + 1);
		if (pen >= 0) draft.colors[ch] = palette[pen].hex;
	}

	function clear() {
		if (!draft) return;
		draft.rows = blank(size.w, size.h);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!draft) return;
		busy = true;
		formError = null;
		try {
			await saveTemplate({ id: draft.id, name: draft.name, rows: draft.rows, colors: draft.colors });
			editOpen = false;
			draft = null;
			toast('Referensi tersimpan.');
			await load();
		} catch (err) {
			formError = (err as ApiError).message;
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!doomed) return;
		busy = true;
		try {
			await deleteTemplate(doomed.id);
			delOpen = false;
			doomed = null;
			toast('Referensi dihapus.');
			await load();
		} catch (e) {
			error = (e as ApiError).message;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:window bind:innerWidth={vw} />
<svelte:head><title>Referensi · Admin MIVUBI</title></svelte:head>

<header class="head">
	<div>
		<h1>Referensi pola</h1>
		<p class="muted">
			Pola di sini muncul di tombol Referensi dalam Studio. Pengunjung memilih satu, lalu polanya menempel ke papan mereka dengan
			warna palet terdekat. Bisa juga diangkat dari karya yang sudah ada lewat <a href="/admin/artworks">Moderasi</a>.
		</p>
	</div>
	<button class="btn btn-primary" onclick={create}>Referensi baru</button>
</header>

{#if error}<div class="banner" role="alert"><p>{error}</p></div>{/if}

{#if loading}
	<p class="muted state" role="status">Memuat referensi…</p>
{:else if !list.length}
	<div class="state">
		<p class="empty-t">Belum ada referensi.</p>
		<p class="muted">Tombol Referensi di Studio ikut disembunyikan selama daftar ini kosong.</p>
	</div>
{:else}
	<p class="count num" role="status">{list.length} referensi</p>
	<ul class="grid">
		{#each list as t (t.id)}
			{@const s = templateSize(t)}
			<li class="card item">
				<div class="prev"><TemplateGrid rows={t.rows} colors={t.colors} max={150} label="Pratinjau {t.name}" /></div>
				<div class="info">
					<h2>{t.name}</h2>
					<p class="muted small num">{s.w} × {s.h} sel · {Object.keys(t.colors).length} warna</p>
				</div>
				<div class="act">
					<button class="btn btn-secondary" onclick={() => edit(t)}>Ubah</button>
					<button class="btn btn-text danger" onclick={() => ((doomed = t), (delOpen = true))}>Hapus</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<Modal bind:open={editOpen} wide label="Editor referensi">
	{#if draft}
		<form class="dlg-body" onsubmit={submit}>
			<h2>{draft.id ? 'Ubah referensi' : 'Referensi baru'}</h2>

			<div class="row">
				<div class="field">
					<label for="tpl-name">Nama</label>
					<input id="tpl-name" bind:value={draft.name} maxlength="80" placeholder="Pohon" />
				</div>
				<div class="field small-field">
					<label for="tpl-w">Lebar</label>
					<input id="tpl-w" class="num" type="number" min={MIN} max={MAX} value={size.w} onchange={(e) => resize(+e.currentTarget.value, size.h)} />
				</div>
				<div class="field small-field">
					<label for="tpl-h">Tinggi</label>
					<input id="tpl-h" class="num" type="number" min={MIN} max={MAX} value={size.h} onchange={(e) => resize(size.w, +e.currentTarget.value)} />
				</div>
			</div>

			<div class="pens" role="toolbar" aria-label="Warna pena">
				{#each palette as c, i (c.id)}
					<button
						type="button"
						class="pen"
						class:on={pen === i}
						aria-pressed={pen === i}
						aria-label="{c.name ?? c.hex}, warna {i + 1}"
						style:background={c.hex}
						onclick={() => (pen = i)}
					></button>
				{/each}
				<button type="button" class="btn btn-secondary eraser" aria-pressed={pen === -1} onclick={() => (pen = -1)}>Hapus</button>
				<button type="button" class="btn btn-text" onclick={clear}>Kosongkan</button>
			</div>

			<div class="canvas">
				<TemplateGrid rows={draft.rows} colors={draft.colors} max={editMax} {paint} />
			</div>
			<p class="muted small num" role="status">{filled} sel terisi</p>

			{#if formError}<p class="error" role="alert">{formError}</p>{/if}

			<div class="dlg-actions">
				<button type="button" class="btn btn-secondary" onclick={() => (editOpen = false)}>Batal</button>
				<button class="btn btn-primary" disabled={busy || !filled || !draft.name.trim()}>{busy ? 'Menyimpan…' : 'Simpan referensi'}</button>
			</div>
		</form>
	{/if}
</Modal>

<Modal bind:open={delOpen} label="Hapus referensi">
	{#if doomed}
		<div class="dlg-body">
			<h2>Hapus referensi?</h2>
			<p>"{doomed.name}" hilang dari galeri Referensi di Studio. Karya yang sudah memakainya tidak berubah.</p>
			<div class="dlg-actions">
				<button class="btn btn-secondary" onclick={() => (delOpen = false)}>Batal</button>
				<button class="btn btn-danger" disabled={busy} onclick={remove}>Hapus</button>
			</div>
		</div>
	{/if}
</Modal>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}
	.head p {
		max-width: 68ch;
		margin-top: 4px;
	}
	.state {
		padding: 32px 0;
	}
	.empty-t {
		font-weight: 600;
	}
	.count {
		font-size: var(--text-sm);
		color: var(--muted);
	}

	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 14px;
	}
	.item {
		display: grid;
		gap: 10px;
		padding: 12px;
	}
	.prev {
		display: grid;
		place-items: center;
		min-height: 170px;
		padding: 10px;
		background: var(--section-blue);
		border-radius: var(--radius-sm);
	}
	h2 {
		font-size: var(--text-md);
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.small {
		font-size: var(--text-xs);
	}
	.act {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.act .btn {
		min-height: 40px;
	}
	.danger {
		color: var(--danger);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.row .field {
		flex: 1 1 200px;
		min-width: 0;
	}
	.row .small-field {
		flex: 0 0 96px;
	}
	.pens {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}
	.pen {
		width: 34px;
		height: 34px;
		border: var(--outline-thin);
		border-radius: var(--radius-xs);
		cursor: pointer;
	}
	.pen.on {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	.eraser {
		min-height: 34px;
		padding: 0 12px;
	}
	.canvas {
		display: grid;
		place-items: center;
		padding: 12px;
		background: var(--section-blue);
		border-radius: var(--radius-sm);
		overflow: auto;
	}
	@media (max-width: 560px) {
		.head .btn {
			width: 100%;
		}
	}
</style>
