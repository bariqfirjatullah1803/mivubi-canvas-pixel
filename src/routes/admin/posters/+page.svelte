<script lang="ts">
	// Katalog template poster (PRD §9.14 FR-POSTER): preset bawaan + desain PNG unggahan.
	import Modal from '$lib/components/Modal.svelte';
	import { TEMPLATES, applyTemplate, createProject, type Project } from '$lib/grid';
	import { DEFAULT_POSTER_AREA, POSTER_H, POSTER_W, renderPosterTemplate, type PosterTemplate } from '$lib/render';
	import {
		createPosterTemplate,
		deletePosterTemplate,
		getSettings,
		listPosterTemplates,
		savePosterTemplate,
		uploadPosterDesign,
		type ApiError
	} from '$lib/store';
	import { toast } from '$lib/ui.svelte';

	const INFO = { title: 'Rumah kecil', creator: 'Contoh MIVUBI', social: '@mivubi' };

	let list = $state<PosterTemplate[]>([]);
	let sample = $state<Project | null>(null);
	let previews = $state<Record<string, string>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	let draft = $state<PosterTemplate | null>(null);
	let editOpen = $state(false);
	let draftPreview = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let busy = $state(false);
	let doomed = $state<PosterTemplate | null>(null);
	let delOpen = $state(false);

	async function load() {
		loading = true;
		try {
			const [tpl, settings] = await Promise.all([listPosterTemplates(), getSettings()]);
			list = tpl;
			// Contoh karya tetap (PRD FR-POSTER-06) supaya dua template bisa dibandingkan adil.
			sample = applyTemplate(createProject(settings.canvas, settings.palette), TEMPLATES.find((t) => t.id === 'house') ?? TEMPLATES[0]);
			error = null;
			shoot();
		} catch (e) {
			error = (e as ApiError).message;
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		load();
	});

	function shoot() {
		const p = sample;
		if (!p) return;
		for (const t of list) renderPosterTemplate(p, INFO, t).then((c) => (previews[t.id] = c.toDataURL('image/png')));
	}

	/** Pratinjau editor digambar ulang tiap area berubah, memakai renderer yang sama dengan unduhan. */
	$effect(() => {
		const t = draft ? $state.snapshot(draft) : null;
		const p = sample;
		if (!t || !p) return;
		renderPosterTemplate(p, INFO, t as PosterTemplate).then((c) => (draftPreview = c.toDataURL('image/png')));
	});

	function edit(t: PosterTemplate) {
		draft = structuredClone($state.snapshot(t)) as PosterTemplate;
		draft.area ??= { ...DEFAULT_POSTER_AREA };
		draftPreview = previews[t.id] ?? null;
		formError = null;
		editOpen = true;
	}

	async function add() {
		busy = true;
		try {
			const t = await createPosterTemplate();
			await load();
			edit(t);
		} catch (e) {
			error = (e as ApiError).message;
		} finally {
			busy = false;
		}
	}

	async function upload(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || !draft) return;
		busy = true;
		formError = null;
		try {
			const t = await uploadPosterDesign(draft.id, file);
			draft = { ...t, name: draft.name, area: draft.area ?? t.area };
			toast('Desain template tersimpan.');
		} catch (err) {
			formError = (err as ApiError).message;
		} finally {
			busy = false;
		}
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!draft) return;
		busy = true;
		formError = null;
		try {
			await savePosterTemplate(draft.id, { name: draft.name, area: draft.area });
			editOpen = false;
			draft = null;
			toast('Template poster disimpan.');
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
			await deletePosterTemplate(doomed.id);
			delOpen = false;
			doomed = null;
			toast('Template poster dihapus.');
			await load();
		} catch (e) {
			error = (e as ApiError).message;
			delOpen = false;
		} finally {
			busy = false;
		}
	}

</script>

<svelte:head><title>Poster · Admin MIVUBI</title></svelte:head>

<header class="head">
	<div>
		<h1>Template poster</h1>
		<p class="muted">
			Desain yang dipilih pengunjung saat mengunduh PNG karyanya. Template <strong>preset</strong> digambar oleh kode dan membawa judul
			serta nama kreator; template <strong>gambar</strong> memakai PNG unggahanmu sebagai bingkai, karya dipasang di area yang kamu
			tentukan, tanpa teks.
		</p>
	</div>
	<button class="btn btn-primary" disabled={busy || list.length >= 8} onclick={add}>Template baru</button>
</header>

{#if error}<div class="banner" role="alert"><p>{error}</p></div>{/if}

{#if loading}
	<p class="muted state" role="status">Memuat template…</p>
{:else}
	<p class="count num" role="status">{list.length} dari 8 template</p>
	<ul class="grid">
		{#each list as t (t.id)}
			<li class="card item">
				<div class="prev">
					{#if previews[t.id]}
						<img src={previews[t.id]} alt="Pratinjau template {t.name}" />
					{:else}
						<span class="ph">Menyiapkan…</span>
					{/if}
				</div>
				<div>
					<h2>{t.name}</h2>
					<span class="badge">{t.kind === 'preset' ? 'Preset' : 'Gambar'}</span>
				</div>
				<div class="act">
					<button class="btn btn-secondary" onclick={() => edit(t)}>Ubah</button>
					<button class="btn btn-text danger" disabled={list.length <= 1} onclick={() => ((doomed = t), (delOpen = true))}>Hapus</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<Modal bind:open={editOpen} wide label="Ubah template poster">
	{#if draft}
		<form class="dlg-body" onsubmit={submit}>
			<h2>{draft.name}</h2>
			<div class="edit">
				<div class="shot">
					{#if draftPreview}
						<img src={draftPreview} alt="Pratinjau {draft.name} dengan contoh karya" />
					{:else}
						<span class="ph">Menyiapkan…</span>
					{/if}
				</div>

				<div class="side">
					<div class="field">
						<label for="pt-name">Nama</label>
						<input id="pt-name" bind:value={draft.name} maxlength="60" />
					</div>

					{#if draft.kind === 'preset'}
						<p class="note">
							Template preset digambar oleh kode, jadi desainnya tidak bisa diunggah. Mengunggah PNG di sini mengubahnya menjadi
							template gambar dan judul serta nama kreator berhenti ikut tercetak.
						</p>
					{/if}

					<div class="field">
						<label for="pt-file">Desain PNG</label>
						<input id="pt-file" type="file" accept="image/png" disabled={busy} onchange={upload} />
						<span class="help">PNG tepat {POSTER_W} × {POSTER_H} piksel, maksimal 1 MB. Bagian yang transparan menjadi jendela karya.</span>
					</div>

					{#if draft.kind === 'image' && draft.area}
						<fieldset class="area">
							<legend>Area karya</legend>
							<div class="nums">
								<div class="field"><label for="pt-x">X</label><input id="pt-x" class="num" type="number" bind:value={draft.area.x} /></div>
								<div class="field"><label for="pt-y">Y</label><input id="pt-y" class="num" type="number" bind:value={draft.area.y} /></div>
								<div class="field"><label for="pt-w">Lebar</label><input id="pt-w" class="num" type="number" bind:value={draft.area.width} /></div>
								<div class="field"><label for="pt-h">Tinggi</label><input id="pt-h" class="num" type="number" bind:value={draft.area.height} /></div>
							</div>
							<span class="help">Karya dipasang di dalam kotak ini: proporsinya dijaga dan dipusatkan.</span>
						</fieldset>
					{/if}

					{#if formError}<p class="error" role="alert">{formError}</p>{/if}
				</div>
			</div>

			<div class="dlg-actions">
				<button type="button" class="btn btn-secondary" onclick={() => (editOpen = false)}>Batal</button>
				<button class="btn btn-primary" disabled={busy || !draft.name.trim()}>{busy ? 'Menyimpan…' : 'Simpan template'}</button>
			</div>
		</form>
	{/if}
</Modal>

<Modal bind:open={delOpen} label="Hapus template poster">
	{#if doomed}
		<div class="dlg-body">
			<h2>Hapus template poster?</h2>
			<p>"{doomed.name}" hilang dari pilihan desain di dialog Bagikan. Karya yang sudah diunduh tidak berubah.</p>
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
	.count {
		font-size: var(--text-sm);
		color: var(--muted);
	}
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 14px;
	}
	.item {
		display: grid;
		gap: 10px;
		padding: 12px;
	}
	.prev,
	.shot {
		display: grid;
		place-items: center;
		background: var(--section-blue);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
	.prev img,
	.shot img {
		display: block;
		width: 100%;
		height: auto;
	}
	.ph {
		display: grid;
		place-items: center;
		width: 100%;
		aspect-ratio: 9 / 16;
		font-size: var(--text-xs);
		color: var(--muted);
	}
	h2 {
		font-size: var(--text-md);
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.item .badge {
		margin-top: 4px;
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

	.edit {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	.side {
		display: grid;
		gap: 14px;
	}
	.note {
		padding: 10px 12px;
		background: var(--highlight);
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
	}
	.area {
		margin: 0;
		padding: 12px;
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
	}
	legend {
		padding: 0 6px;
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.nums {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
		margin-bottom: 6px;
	}
	.nums input {
		padding: 8px;
	}
	@media (max-width: 700px) {
		.edit {
			grid-template-columns: minmax(0, 1fr);
		}
		.shot {
			max-width: 220px;
			justify-self: center;
		}
		.nums {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 560px) {
		.head .btn {
			width: 100%;
		}
	}
</style>
