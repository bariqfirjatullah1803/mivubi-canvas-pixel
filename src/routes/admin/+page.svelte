<script lang="ts">
	// Ringkasan Admin: angka pameran di atas, karya terbaru di bawah (DESIGN §13.2).
	import MiniBoard from '$lib/components/MiniBoard.svelte';
	import { gridOf } from '$lib/grid';
	import { adminArtworks, displayCreator, displayTitle, getSettings, type AdminItem, type Settings } from '$lib/store';
	import { timeAgo } from '$lib/ui.svelte';

	let settings = $state<Settings | null>(null);
	let items = $state<AdminItem[]>([]);
	let ready = $state(false);

	$effect(() => {
		getSettings().then((s) => (settings = s));
		adminArtworks('all', '').then((a) => ((items = a), (ready = true)));
	});

	const grid = $derived(settings ? gridOf(settings.canvas) : null);
	const hidden = $derived(items.filter((i) => i.takenDownAt).length);
	const latest = $derived(items.slice(0, 8));
</script>

<svelte:head><title>Admin · MIVUBI</title></svelte:head>

<header class="head">
	<div>
		<h1>Ringkasan</h1>
		<p class="muted">Keadaan pameran hari ini. Moderasi di sini bersifat reaktif: karya tampil dulu, Admin menurunkan yang bermasalah.</p>
	</div>
	<a class="btn btn-primary" href="/admin/artworks">Buka moderasi</a>
</header>

<div class="stats">
	<div class="stat">
		<span class="k">Tampil publik</span>
		<strong class="v num">{ready ? items.length - hidden : '—'}</strong>
		<span class="muted small">karya di Canvas World</span>
	</div>
	<div class="stat" class:warn={hidden > 0}>
		<span class="k">Ditakedown</span>
		<strong class="v num">{ready ? hidden : '—'}</strong>
		<span class="muted small">disembunyikan, data tetap utuh</span>
	</div>
	<div class="stat">
		<span class="k">Grid papan</span>
		<strong class="v num">{grid ? `${grid.columns} × ${grid.rows}` : '—'}</strong>
		<span class="muted small">
			{#if settings}{settings.canvas.widthMm / 10} × {settings.canvas.heightMm / 10} cm{/if}
		</span>
	</div>
	<div class="stat">
		<span class="k">Palet terkunci</span>
		<strong class="v num">{settings ? settings.palette.length : '—'}</strong>
		<span class="muted small">warna · gap World {settings?.gap ?? '—'} sel</span>
	</div>
</div>

<div class="split">
	<section class="panel">
		<div class="panel-head">
			<h2>Karya terbaru</h2>
			<a href="/admin/artworks">Lihat semua</a>
		</div>
		{#if !ready}
			<p class="muted pad" role="status">Memuat karya…</p>
		{:else if !latest.length}
			<p class="muted pad">Belum ada karya publik. Angka di atas akan terisi begitu pengunjung menyimpan karya pertamanya.</p>
		{:else}
			<ul class="grid">
				{#each latest as it (it.id)}
					<li>
						<a href="/art/{it.id}" class="tile" class:down={it.takenDownAt}>
							<span class="thumb"><MiniBoard project={it.project} label="" maxHeight={130} /></span>
							<span class="t">{displayTitle(it.title)}</span>
							<span class="muted small">{displayCreator(it.creatorName)} · {timeAgo(it.updatedAt)}</span>
							{#if it.takenDownAt}<span class="badge hidden">Ditakedown</span>{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="panel">
		<div class="panel-head">
			<h2>Pengaturan pameran</h2>
			<a href="/admin/settings">Ubah</a>
		</div>
		<div class="pad">
			{#if settings && grid}
				<dl>
					<div><dt>Ukuran fisik</dt><dd class="num">{settings.canvas.widthMm / 10} × {settings.canvas.heightMm / 10} cm</dd></div>
					<div><dt>Ukuran sel</dt><dd class="num">{settings.canvas.cellMm / 10} cm</dd></div>
					<div><dt>Total sel</dt><dd class="num">{(grid.columns * grid.rows).toLocaleString('id-ID')}</dd></div>
					<div><dt>Gap World</dt><dd class="num">{settings.gap} sel</dd></div>
				</dl>
				<p class="label">Palet blok</p>
				<ul class="swatches">
					{#each settings.palette as c (c.id)}
						<li><span style:background={c.hex}></span>{c.name ?? c.hex}</li>
					{/each}
				</ul>
				<p class="muted small">Perubahan pengaturan hanya berlaku untuk karya baru.</p>
			{:else}
				<p class="muted" role="status">Memuat pengaturan…</p>
			{/if}
		</div>
	</section>
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}
	.head p {
		max-width: 62ch;
		margin-top: 4px;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}
	.stat {
		display: grid;
		gap: 2px;
		padding: 16px;
		border: var(--outline-thin);
		border-radius: var(--radius-md);
	}
	.stat.warn {
		background: var(--highlight);
	}
	.k {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
	}
	.v {
		font-size: 31px;
		font-weight: 700;
		line-height: 1.15;
	}
	.small {
		font-size: var(--text-xs);
	}

	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: 20px;
		align-items: start;
	}
	.panel {
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--line);
	}
	h2 {
		font-size: var(--text-md);
		font-weight: 600;
	}
	.panel-head a {
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.pad {
		padding: 16px;
	}

	.grid {
		list-style: none;
		margin: 0;
		padding: 16px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 14px;
	}
	.tile {
		display: grid;
		gap: 4px;
		justify-items: start;
		padding: 8px;
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
		color: var(--ink);
		text-decoration: none;
	}
	.tile:hover {
		background: var(--highlight);
	}
	.tile.down {
		opacity: 0.7;
	}
	.thumb {
		display: block;
		width: 100%;
		padding: 6px;
		border-radius: var(--radius-xs);
		background: var(--section-blue);
	}
	.t {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	dl {
		margin: 0 0 16px;
		display: grid;
		gap: 8px;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--line);
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-weight: 500;
	}
	.label {
		font-size: var(--text-sm);
		font-weight: 500;
		margin-bottom: 8px;
	}
	.swatches {
		list-style: none;
		margin: 0 0 12px;
		padding: 0;
		display: grid;
		gap: 4px;
		font-size: var(--text-xs);
		max-height: 210px;
		overflow-y: auto;
	}
	.swatches li {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.swatches span {
		width: 16px;
		height: 16px;
		flex: none;
		border-radius: 3px;
		border: 1px solid var(--line);
	}

	@media (max-width: 1100px) {
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 800px) {
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 560px) {
		.head p {
			font-size: var(--text-sm);
		}
		.v {
			font-size: 25px;
		}
		.stat {
			padding: 12px 14px;
		}
		.grid {
			padding: 12px;
			gap: 10px;
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		}
	}
</style>
