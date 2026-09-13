<script lang="ts">
	// Halaman karya publik (PRD F11). Dua tampilan: papan yang bisa di-zoom, dan pratinjau poster.
	import BoardCanvas from '$lib/components/BoardCanvas.svelte';
	import PosterPicker from '$lib/components/PosterPicker.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { canvasBlob, posterFileName, renderPosterTemplate, type PosterTemplate } from '$lib/render';
	import { artUrl, copyText, download, shareOrFallback } from '$lib/share';
	import { displayCreator, displayTitle, listPosterTemplates, publicArtwork, type PublicArtwork } from '$lib/store';
	import { timeAgo, toast } from '$lib/ui.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let art = $state<PublicArtwork | null>(null);
	let status = $state<'loading' | 'ok' | 'missing'>('loading');
	let chosen = $state('');
	let templates = $state<PosterTemplate[]>([]);
	let view = $state<'board' | 'poster'>('board');
	let posterUrl = $state<string | null>(null);
	let busy = $state(false);
	let manual: string | null = $state(null);
	let zoom = $state(1);
	let board: BoardCanvas | undefined = $state();

	$effect(() => {
		const id = params.id;
		status = 'loading';
		publicArtwork(id)
			.then((a) => ((art = a), (status = 'ok')))
			.catch(() => (status = 'missing'));
	});

	const info = $derived(
		art ? { title: displayTitle(art.title), creator: art.creatorName, social: art.socialHandle } : { title: '', creator: null, social: null }
	);
	const preset = $derived(templates.find((t) => t.id === chosen) ?? templates[0] ?? null);

	$effect(() => {
		listPosterTemplates()
			.then((t) => {
				templates = t;
				if (!t.some((x) => x.id === chosen)) chosen = t[0]?.id ?? '';
			})
			.catch(() => (templates = []));
	});

	// Pratinjau poster ikut berubah setiap desain diganti.
	$effect(() => {
		const a = art,
			pr = preset,
			i = { ...info };
		if (!a || !pr) return;
		posterUrl = null;
		renderPosterTemplate(a.project, i, pr).then((c) => (posterUrl = c.toDataURL('image/png')));
	});

	function pick(id: string) {
		chosen = id;
		view = 'poster';
	}

	async function poster() {
		return canvasBlob(await renderPosterTemplate(art!.project, info, preset!));
	}
	async function share() {
		busy = true;
		try {
			const msg = await shareOrFallback(await poster(), posterFileName(info.title, chosen), info.title, artUrl(art!.id));
			if (msg) toast(msg);
		} finally {
			busy = false;
		}
	}
	async function save() {
		busy = true;
		try {
			toast(download(await poster(), posterFileName(info.title, chosen)) ? 'PNG diunduh.' : 'PNG belum dapat diunduh.');
		} finally {
			busy = false;
		}
	}
	async function copy() {
		manual = null;
		if (await copyText(artUrl(art!.id))) toast('Link disalin.');
		else manual = artUrl(art!.id);
	}
</script>

<svelte:head>
	<title>{art ? `${displayTitle(art.title)} · Canvas World` : 'Canvas World'} · MIVUBI</title>
</svelte:head>

<div class="page">
	<SiteHeader />

	{#if status === 'ok' && art}
		<main class="art">
			<section class="stage" aria-label="Karya {info.title}">
				<div class="views" role="tablist" aria-label="Tampilan karya">
					<button role="tab" aria-selected={view === 'board'} class:on={view === 'board'} onclick={() => (view = 'board')}>Papan</button>
					<button role="tab" aria-selected={view === 'poster'} class:on={view === 'poster'} onclick={() => (view = 'poster')}>Poster</button>
				</div>

				{#if view === 'board'}
					<BoardCanvas
						bind:this={board}
						project={art.project}
						editable={false}
						showGrid={false}
						bind:zoom
						insetTop={72}
						insetBottom={64}
						label="Karya {info.title}, {art.project.columns} × {art.project.rows} sel. Panah untuk menggeser, plus dan minus untuk zoom."
					/>
					<div class="controls">
						<button class="btn btn-secondary btn-icon" aria-label="Perkecil" onclick={() => board?.zoomBy(1 / 1.2)}>−</button>
						<span class="pct num">{Math.round(zoom * 100)}%</span>
						<button class="btn btn-secondary btn-icon" aria-label="Perbesar" onclick={() => board?.zoomBy(1.2)}>+</button>
						<button class="btn btn-secondary" onclick={() => board?.fit()}>Fit</button>
					</div>
				{:else}
					<div class="poster-view">
						{#if posterUrl}
							<img src={posterUrl} alt="Pratinjau poster {preset.name} untuk {info.title}" />
						{:else}
							<p class="muted" role="status">Menyiapkan pratinjau…</p>
						{/if}
					</div>
				{/if}
			</section>

			<aside class="info">
				<div class="head">
					<h1>{info.title}</h1>
					<p class="by">oleh <strong>{displayCreator(art.creatorName)}</strong>{#if art.socialHandle} · {art.socialHandle}{/if}</p>
					<p class="facts num">{art.project.columns} × {art.project.rows} sel · Diperbarui {timeAgo(art.updatedAt)}</p>
				</div>

				<div class="picker">
					<PosterPicker project={art.project} {info} {templates} bind:chosen onpick={pick} />
					{#if view === 'board'}
						<p class="muted hintline">Pilih desain untuk melihat pratinjau besarnya.</p>
					{/if}
				</div>

				{#if manual}
					<div class="field">
						<label for="manual-link">Browser menolak salin otomatis. Salin link ini secara manual.</label>
						<input id="manual-link" readonly value={manual} onfocus={(e) => e.currentTarget.select()} />
					</div>
				{/if}

				<div class="actions">
					<button class="btn btn-primary" disabled={busy} onclick={share}>Bagikan karya</button>
					<div class="row">
						<button class="btn btn-secondary" disabled={busy} onclick={save}>Unduh PNG</button>
						<button class="btn btn-secondary" onclick={copy}>Salin link</button>
					</div>
					<a class="more-link" href="/world">Lihat karya lain di Canvas World</a>
				</div>
			</aside>
		</main>
	{:else if status === 'missing'}
		<main class="missing">
			<h1>Karya tidak ditemukan</h1>
			<p class="muted">Karya ini tidak ada atau sudah tidak tersedia untuk publik.</p>
			<a class="btn btn-primary" href="/world">Buka Canvas World</a>
		</main>
	{:else}
		<p class="muted loading" role="status">Memuat karya…</p>
	{/if}
</div>

<style>
	.page {
		height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	.art {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 380px;
		flex: 1;
		min-height: 0;
	}
	.stage {
		position: relative;
		background: var(--section-blue);
		min-height: 420px;
	}
	/* Pindah tampilan: papan yang bisa di-zoom, atau poster yang akan dibagikan. */
	.views {
		position: absolute;
		top: 16px;
		left: 16px;
		z-index: 2;
		display: flex;
		gap: 2px;
		padding: 4px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: 999px;
		box-shadow: 0 6px 16px rgb(21 61 43 / 0.12);
	}
	.views button {
		min-height: 36px;
		padding: 0 16px;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--ink);
		font-weight: 500;
		cursor: pointer;
	}
	.views button:hover {
		background: var(--highlight);
	}
	.views button.on {
		background: var(--section-green);
		box-shadow: inset 0 0 0 1.5px var(--outline);
		font-weight: 600;
	}
	.poster-view {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-rows: minmax(0, 1fr);
		place-items: center;
		padding: 88px 24px 24px;
	}
	.poster-view img {
		width: auto;
		height: auto;
		max-width: min(100%, 420px);
		max-height: 100%;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
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
	.info {
		display: grid;
		align-content: start;
		gap: 24px;
		padding: 28px 24px 40px;
		border-left: var(--outline-thin);
		overflow-y: auto;
	}
	.head {
		display: grid;
		gap: 6px;
	}
	h1 {
		font-size: var(--text-2xl);
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	.facts {
		font-size: var(--text-sm);
		color: var(--muted);
	}
	.picker {
		display: grid;
		gap: 8px;
		padding-top: 20px;
		border-top: 1px solid var(--line);
	}
	.hintline {
		font-size: var(--text-sm);
	}
	.actions {
		display: grid;
		gap: 8px;
		padding-top: 20px;
		border-top: 1px solid var(--line);
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.more-link {
		justify-self: start;
		margin-top: 4px;
		font-weight: 500;
	}
	.missing {
		display: grid;
		justify-items: center;
		gap: 16px;
		padding: 96px 16px;
		text-align: center;
	}
	.missing h1 {
		font-size: var(--text-xl);
	}
	.loading {
		padding: 48px 16px;
		text-align: center;
	}
	@media (max-width: 900px) {
		.page {
			height: auto;
			min-height: 100dvh;
		}
		.art {
			grid-template-columns: minmax(0, 1fr);
		}
		.stage {
			height: 62vh;
		}
		.info {
			overflow: visible;
			border-left: 0;
			border-top: var(--outline-thin);
			padding: 24px 16px 40px;
		}
	}
</style>
