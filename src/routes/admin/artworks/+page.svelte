<script lang="ts">
	// Moderasi reaktif (PRD FR-MOD, DESIGN §13.3).
	import MiniBoard from '$lib/components/MiniBoard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { adminArtworks, displayCreator, displayTitle, moderate, templateFromArtwork, type AdminItem, type ApiError } from '$lib/store';
	import { formatDate, timeAgo, toast } from '$lib/ui.svelte';

	type Status = 'all' | 'shown' | 'hidden';
	let status: Status = $state('all');
	let q = $state('');
	let items: AdminItem[] = $state([]);
	let error: string | null = $state(null);
	let loading = $state(true);
	let target: AdminItem | null = $state(null);
	let reason = $state('');
	let dialogOpen = $state(false);
	let dialogError: string | null = $state(null);
	let busy: string | null = $state(null);

	const tabs: [Status, string][] = [
		['all', 'Semua'],
		['shown', 'Tampil publik'],
		['hidden', 'Ditakedown']
	];

	async function load() {
		loading = true;
		try {
			items = await adminArtworks(status, q);
			error = null;
		} catch (e) {
			error = (e as ApiError).message;
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		void status;
		load();
	});

	function askTakedown(it: AdminItem) {
		target = it;
		reason = it.takedownReason ?? '';
		dialogError = null;
		dialogOpen = true;
	}

	/** Angkat karya jadi referensi di Studio, tanpa menggambar ulang polanya. */
	async function promote(it: AdminItem) {
		busy = it.id;
		try {
			const t = await templateFromArtwork(it.id);
			toast(`"${t.name}" masuk ke daftar Referensi.`);
		} catch (e) {
			error = (e as ApiError).message;
		} finally {
			busy = null;
		}
	}

	async function act(it: AdminItem, action: 'take-down' | 'restore', why = '') {
		busy = it.id;
		try {
			await moderate(it.id, action, why);
			dialogOpen = false;
			toast(action === 'take-down' ? 'Karya tidak tampil di publik.' : 'Karya tampil lagi di Canvas World.');
			await load();
		} catch (e) {
			if (action === 'take-down') dialogError = (e as ApiError).message;
			else error = (e as ApiError).message;
		} finally {
			busy = null;
		}
	}
</script>

<svelte:head><title>Moderasi · Admin MIVUBI</title></svelte:head>

<header class="head">
	<div>
		<h1>Moderasi karya</h1>
		<p class="muted">Takedown menyembunyikan karya dari Canvas World dan halaman publiknya. Data karya tidak dihapus dan pemilik tetap bisa mengeditnya.</p>
	</div>
</header>

<div class="bar">
	<div class="tabs" role="tablist" aria-label="Saring status">
		{#each tabs as [id, label] (id)}
			<button role="tab" aria-selected={status === id} class:on={status === id} onclick={() => (status = id)}>{label}</button>
		{/each}
	</div>
	<form
		class="search"
		onsubmit={(e) => {
			e.preventDefault();
			load();
		}}
	>
		<label class="sr-only" for="mod-q">Cari judul, kreator, akun sosial, atau username</label>
		<input id="mod-q" bind:value={q} maxlength="100" type="search" placeholder="Cari judul, kreator, akun sosial, username…" />
		<button class="btn btn-secondary">Cari</button>
	</form>
</div>

{#if error}<div class="banner" role="alert"><p>{error}</p></div>{/if}

{#if loading}
	<p class="muted state" role="status">Memuat karya…</p>
{:else if !items.length}
	<div class="state">
		<p class="empty-t">Tidak ada karya yang cocok.</p>
		<p class="muted">Coba ganti kata kunci, atau pilih tab Semua untuk melihat seluruh karya publik.</p>
	</div>
{:else}
	<p class="count num" role="status">{items.length} karya</p>
	<ul class="rows">
		{#each items as it (it.id)}
			<li class="row" class:down={!!it.takenDownAt}>
				<a class="thumb" href="/art/{it.id}" aria-label="Buka halaman publik {displayTitle(it.title)}">
					<MiniBoard project={it.project} label="" maxHeight={110} />
				</a>
				<div class="meta">
					<div class="tags">
						{#if it.takenDownAt}
							<span class="badge hidden">Ditakedown</span>
						{:else}
							<span class="badge public">Tampil publik</span>
						{/if}
						<span class="badge num">rev {it.revision}</span>
						<span class="muted small num">{it.project.columns} × {it.project.rows} sel</span>
					</div>
					<h2>{displayTitle(it.title)}</h2>
					<p class="muted small">
						{[displayCreator(it.creatorName), it.socialHandle].filter(Boolean).join(' · ')}{#if it.ownerName}
							· akun {it.ownerName}{/if}
					</p>
					<p class="muted small">Diperbarui {timeAgo(it.updatedAt)}<span class="exact"> · {formatDate(it.updatedAt)}</span></p>
					{#if it.takedownReason}<p class="reason">Alasan takedown: {it.takedownReason}</p>{/if}
				</div>
				<div class="act">
					<button class="btn btn-secondary" disabled={busy === it.id} onclick={() => promote(it)}>Jadikan referensi</button>
					{#if it.takenDownAt}
						<button class="btn btn-secondary" disabled={busy === it.id} onclick={() => act(it, 'restore')}>Pulihkan</button>
					{:else}
						<button class="btn btn-danger" disabled={busy === it.id} onclick={() => askTakedown(it)}>Takedown</button>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<Modal bind:open={dialogOpen} label="Takedown karya">
	{#if target}
		<form
			class="dlg-body"
			onsubmit={(e) => {
				e.preventDefault();
				act(target!, 'take-down', reason);
			}}
		>
			<h2>Takedown karya?</h2>
			<p>
				{displayTitle(target.title)} berhenti tampil di Canvas World dan halaman publiknya. Pemilik tetap dapat membuka dan mengedit
				karya.
			</p>
			<div class="field">
				<label for="td-reason">Alasan takedown</label>
				<textarea
					id="td-reason"
					bind:value={reason}
					maxlength="500"
					required
					aria-invalid={dialogError ? 'true' : undefined}
					aria-describedby="td-help{dialogError ? ' td-error' : ''}"
				></textarea>
				<span class="help" id="td-help">Wajib diisi, maksimal 500 karakter. Alasan hanya terlihat oleh Admin.</span>
				{#if dialogError}<span class="error" id="td-error" role="alert">{dialogError}</span>{/if}
			</div>
			<div class="dlg-actions">
				<button type="button" class="btn btn-secondary" onclick={() => (dialogOpen = false)}>Batal</button>
				<button class="btn btn-danger" disabled={!reason.trim() || busy === target.id}>Takedown</button>
			</div>
		</form>
	{/if}
</Modal>

<style>
	.head p {
		max-width: 68ch;
		margin-top: 4px;
	}

	/* Satu baris kontrol: tab status di kiri, pencarian di kanan. */
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.tabs {
		display: flex;
		gap: 2px;
		padding: 4px;
		max-width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
		border: var(--outline-thin);
		border-radius: 999px;
	}
	.tabs button {
		flex: none;
		white-space: nowrap;
		min-height: 36px;
		padding: 0 14px;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}
	.tabs button:hover {
		background: var(--highlight);
	}
	.tabs button.on {
		background: var(--section-green);
		box-shadow: inset 0 0 0 1.5px var(--outline);
		font-weight: 600;
	}
	.search {
		display: flex;
		gap: 8px;
		flex: 1 1 260px;
		min-width: 0;
		max-width: 460px;
	}
	.search input {
		flex: 1;
		min-width: 0;
		min-height: 44px;
		padding: 0 14px;
		border: var(--outline-thin);
		border-radius: 999px;
		background: var(--bg);
		color: var(--ink);
		font: inherit;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.count {
		font-size: var(--text-sm);
		color: var(--muted);
	}
	.state {
		padding: 40px 0;
	}
	.empty-t {
		font-weight: 600;
		margin-bottom: 4px;
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.row {
		display: grid;
		grid-template-columns: 132px minmax(0, 1fr) auto;
		gap: 20px;
		align-items: center;
		padding: 14px 16px;
		border: var(--outline-thin);
		border-radius: var(--radius-md);
	}
	.row:hover {
		background: var(--highlight);
	}
	.row.down {
		border-color: var(--danger);
	}
	.thumb {
		display: block;
		padding: 6px;
		border-radius: var(--radius-sm);
		background: var(--section-blue);
	}
	.meta {
		display: grid;
		gap: 3px;
		min-width: 0;
	}
	.tags {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 2px;
	}
	h2 {
		font-size: var(--text-md);
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.small {
		font-size: var(--text-sm);
	}
	.reason {
		margin-top: 4px;
		font-size: var(--text-sm);
		color: var(--danger);
		font-weight: 500;
	}

	@media (max-width: 800px) {
		.search {
			max-width: none;
		}
		/* Aksi pindah ke bawah meta, bukan selebar kartu: tombol merah selebar layar
		   membuat setiap baris terasa seperti peringatan. */
		.row {
			grid-template-columns: 84px minmax(0, 1fr);
			gap: 12px 14px;
			align-items: start;
			padding: 12px;
		}
		.act {
			grid-column: 2;
			justify-self: start;
		}
		.act :global(.btn) {
			min-height: 40px;
			padding: 0 18px;
		}
	}
	@media (max-width: 560px) {
		.head p {
			font-size: var(--text-sm);
		}
		.exact {
			display: none;
		}
		.tabs {
			width: 100%;
		}
		.tabs button {
			flex: 1;
			padding: 0 8px;
			font-size: var(--text-sm);
		}
		.search {
			flex-basis: 100%;
		}
	}
</style>
