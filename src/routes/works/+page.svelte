<script lang="ts">
	// Karyaku (PRD F9): galeri karya dengan tab, kartu bergaya berkas, dan menu aksi.
	import { goto } from '$app/navigation';
	import MiniBoard from '$lib/components/MiniBoard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { createProject } from '$lib/grid';
	import {
		createCloudProject,
		deleteCloudProject,
		displayCreator,
		displayTitle,
		getSettings,
		listMyProjects,
		saveDraft,
		type ApiError,
		type Summary
	} from '$lib/store';
	import { artUrl, copyText } from '$lib/share';
	import { refreshAuth, timeAgo, toast } from '$lib/ui.svelte';

	type Tab = 'all' | 'saved' | 'draft';

	let items: Summary[] = $state([]);
	let status: 'loading' | 'ok' | 'error' = $state('loading');
	let pageError: string | null = $state(null);
	let tab = $state<Tab>('all');
	let menuFor: string | null = $state(null);
	let target: Summary | null = $state(null);
	let confirmOpen = $state(false);
	let deleting: string | null = $state(null);
	let manual: string | null = $state(null);
	let creating = $state(false);

	async function load() {
		status = 'loading';
		try {
			await refreshAuth();
			items = await listMyProjects();
			status = 'ok';
		} catch (e) {
			pageError = (e as ApiError).message;
			status = 'error';
		}
	}
	$effect(() => {
		load();
	});

	const saved = $derived(items.filter((i) => i.savedAt));
	const drafts = $derived(items.filter((i) => !i.savedAt));
	const shown = $derived(tab === 'saved' ? saved : tab === 'draft' ? drafts : items);
	const tabs = $derived<[Tab, string, number][]>([
		['all', 'Semua', items.length],
		['saved', 'Tersimpan', saved.length],
		['draft', 'Draf', drafts.length]
	]);

	function chip(it: Summary) {
		if (!it.savedAt) return { text: 'Draf', cls: 'draft' };
		if (it.takenDownAt) return { text: 'Tidak tampil', cls: 'hidden' };
		return it.visibility === 'public' ? { text: 'Publik', cls: 'public' } : { text: 'Privat', cls: '' };
	}

	/** Buat draf baru, lalu buka Studio-nya (PRD F2). */
	async function newWork() {
		if (creating) return;
		creating = true;
		pageError = null;
		try {
			const s = await getSettings();
			const p = createProject(s.canvas, s.palette);
			saveDraft(p);
			await createCloudProject(p);
			goto(`/project/${p.id}`);
		} catch (e) {
			pageError = (e as ApiError).message;
			creating = false;
		}
	}

	// Menu "…" per kartu.
	$effect(() => {
		if (!menuFor) return;
		const down = (e: PointerEvent) => {
			if (!(e.target as HTMLElement).closest('.more, .menu')) menuFor = null;
		};
		const key = (e: KeyboardEvent) => e.key === 'Escape' && (menuFor = null);
		document.addEventListener('pointerdown', down);
		document.addEventListener('keydown', key);
		return () => {
			document.removeEventListener('pointerdown', down);
			document.removeEventListener('keydown', key);
		};
	});

	function ask(it: Summary) {
		menuFor = null;
		target = it;
		confirmOpen = true;
	}

	async function remove() {
		const it = target!;
		confirmOpen = false;
		deleting = it.id;
		pageError = null;
		try {
			await deleteCloudProject(it.id, it.revision);
			items = items.filter((x) => x.id !== it.id);
			toast('Karya masuk Sampah.');
		} catch (e) {
			pageError = `${displayTitle(it.title ?? it.name)} belum terhapus. ${(e as ApiError).message}`;
		} finally {
			deleting = null;
		}
	}

	async function copy(it: Summary) {
		menuFor = null;
		manual = null;
		if (await copyText(artUrl(it.id))) toast('Link disalin.');
		else manual = artUrl(it.id);
	}
</script>

<svelte:head><title>Karyaku · MIVUBI Canvas Pixel</title><meta name="robots" content="noindex" /></svelte:head>

<SiteHeader current="works" />

<main class="page">
	<div class="head">
		<div>
			<h1>Karyaku</h1>
			<p class="muted">Draf dan karya yang tersimpan di perangkat atau akunmu.</p>
		</div>
		<button class="btn btn-primary" disabled={creating} onclick={newWork}>
			{creating ? 'Menyiapkan studio…' : '+ Buat karya baru'}
		</button>
	</div>

	{#if pageError}
		<div class="banner" role="alert">
			<p>{pageError}</p>
			{#if status === 'error'}<button class="btn btn-secondary" onclick={load}>Coba lagi</button>{/if}
			<button class="btn btn-text" onclick={() => (pageError = null)}>Tutup</button>
		</div>
	{/if}
	{#if manual}
		<div class="field manual">
			<label for="manual-link">Browser menolak salin otomatis. Salin link ini secara manual.</label>
			<input id="manual-link" readonly value={manual} onfocus={(e) => e.currentTarget.select()} />
		</div>
	{/if}

	{#if status === 'ok' && items.length}
		<div class="tabs" role="tablist" aria-label="Saring karya">
			{#each tabs as [id, label, n] (id)}
				<button role="tab" aria-selected={tab === id} class:on={tab === id} onclick={() => (tab = id)}>
					{label}<span class="count num">{n}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if status === 'loading'}
		<p class="muted" role="status">Memuat karyamu…</p>
	{:else if status === 'error'}
		<section class="empty">
			<h2>Karyamu belum dapat dimuat</h2>
			<p class="muted">Tidak ada karya yang dihapus.</p>
		</section>
	{:else if !items.length}
		<section class="empty">
			<h2>Kamu belum punya karya</h2>
			<p class="muted">Karya yang kamu simpan akan muncul di sini.</p>
			<button class="btn btn-primary" disabled={creating} onclick={newWork}>
				{creating ? 'Menyiapkan studio…' : 'Mulai berkarya'}
			</button>
		</section>
	{:else}
		<ul class="grid">
			{#each shown as it (it.id)}
				{@const c = chip(it)}
				{@const title = it.savedAt ? displayTitle(it.title ?? it.name) : it.name}
				<li class="work">
					<a class="thumb" href="/project/{it.id}" aria-label="Buka {title} di Studio">
						<MiniBoard project={it.project} label="" grid maxHeight={200} />
						<span class="badge {c.cls}">{c.text}</span>
					</a>
					<div class="foot">
						<div class="txt">
							<h3>{title}</h3>
							<p class="muted">
								{#if it.savedAt}{displayCreator(it.creatorName)} · {/if}{deleting === it.id ? 'Menghapus…' : timeAgo(it.updatedAt)}
							</p>
						</div>
						<button
							class="more"
							aria-label="Aksi lain untuk {title}"
							aria-haspopup="menu"
							aria-expanded={menuFor === it.id}
							onclick={() => (menuFor = menuFor === it.id ? null : it.id)}
						>
							<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
								><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg
							>
						</button>
						{#if menuFor === it.id}
							<div class="menu" role="menu">
								<a role="menuitem" href="/project/{it.id}">{it.savedAt ? 'Edit' : 'Lanjutkan'}</a>
								{#if it.savedAt && it.visibility === 'public' && !it.takenDownAt}
									<button role="menuitem" onclick={() => copy(it)}>Salin link</button>
									<a role="menuitem" href="/art/{it.id}">Buka halaman publik</a>
								{/if}
								<button role="menuitem" class="danger" onclick={() => ask(it)}>Hapus</button>
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
		{#if !shown.length}
			<p class="muted">Belum ada karya di tab ini.</p>
		{/if}
	{/if}
</main>

<Modal bind:open={confirmOpen} label="Hapus karya">
	<div class="dlg-body">
		<h2>Hapus karya ini?</h2>
		<p>
			{target ? displayTitle(target.title ?? target.name) : ''} masuk Sampah dan terhapus permanen setelah 7 hari. Karya ini juga hilang
			dari Canvas World.
		</p>
		<div class="dlg-actions">
			<button class="btn btn-secondary" onclick={() => (confirmOpen = false)}>Batal</button>
			<button class="btn btn-danger" onclick={remove}>Hapus</button>
		</div>
	</div>
</Modal>

<style>
	.page {
		display: grid;
		gap: 24px;
		max-width: 1200px;
		margin: 0 auto;
		padding: 24px 32px 64px;
	}
	.head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: var(--text-xl);
	}
	.tabs {
		display: flex;
		gap: 4px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--line);
	}
	.tabs button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 0 14px;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--ink);
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
	.count {
		font-size: var(--text-xs);
		color: var(--muted);
	}
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 20px;
	}
	.work {
		display: grid;
		gap: 8px;
	}
	/* Kartu tenang: papan yang dominan, teks kecil di bawah, aksi lain di menu. */
	.thumb {
		position: relative;
		display: block;
		padding: 14px;
		background: var(--section-green);
		border: var(--outline-thin);
		border-radius: var(--radius-md);
	}
	.thumb:hover {
		background: color-mix(in srgb, var(--section-green) 70%, var(--highlight));
	}
	.thumb .badge {
		position: absolute;
		top: 8px;
		left: 8px;
	}
	.foot {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.txt {
		min-width: 0;
		flex: 1;
	}
	h3 {
		font-size: var(--text-md);
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.foot p {
		font-size: var(--text-sm);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.more {
		flex: none;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--ink);
		cursor: pointer;
	}
	.more:hover,
	.more[aria-expanded='true'] {
		background: var(--highlight);
	}
	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
		z-index: 20;
		display: grid;
		min-width: 200px;
		padding: 6px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
	}
	.menu a,
	.menu button {
		display: flex;
		align-items: center;
		min-height: 40px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--ink);
		text-decoration: none;
		text-align: left;
		cursor: pointer;
	}
	.menu a:hover,
	.menu button:hover {
		background: var(--highlight);
	}
	.menu .danger {
		color: var(--danger);
	}
	.empty {
		display: grid;
		justify-items: center;
		gap: 12px;
		text-align: center;
		padding: 64px 16px;
	}
	.manual {
		max-width: 560px;
	}
	@media (max-width: 600px) {
		.page {
			padding: 16px 16px 48px;
		}
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 14px;
		}
	}
</style>
