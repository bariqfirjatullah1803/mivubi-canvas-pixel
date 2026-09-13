<script lang="ts">
	// Membuka ulang karya dari cloud atau cadangan lokal (PRD F7).
	import { goto } from '$app/navigation';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import Studio from '$lib/components/Studio.svelte';
	import type { Project } from '$lib/grid';
	import { getCloudProject, readDraft, type ApiError, type Meta } from '$lib/store';
	import { formatDate, refreshAuth } from '$lib/ui.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	type View =
		| { kind: 'loading' }
		| { kind: 'ready'; project: Project; meta: Meta | null; dirty: boolean; backup: boolean }
		| { kind: 'trash'; purgeAfter: string | null }
		| { kind: 'error'; message: string };
	let view: View = $state({ kind: 'loading' });

	async function load(id: string) {
		view = { kind: 'loading' };
		const draft = readDraft(id);
		await refreshAuth();
		try {
			const r = await getCloudProject(id);
			const newer = !!draft && draft.updatedAt > r.updatedAt;
			view = { kind: 'ready', project: newer ? draft! : r.project, meta: r.meta, dirty: newer, backup: false };
		} catch (e) {
			const err = e as ApiError;
			if (err.status === 410) view = { kind: 'trash', purgeAfter: (err.detail.purgeAfter as string) ?? null };
			else if ((err.status === 0 || err.status >= 500) && draft) view = { kind: 'ready', project: draft, meta: null, dirty: true, backup: true };
			else view = { kind: 'error', message: err.message };
		}
	}

	$effect(() => {
		load(params.id);
	});
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

{#if view.kind === 'ready'}
	{#key view.project.id}
		<Studio initial={view.project} initialMeta={view.meta} initialDirty={view.dirty} backup={view.backup} onback={() => goto('/works')} />
	{/key}
{:else}
	<SiteHeader />
	<main class="state">
		{#if view.kind === 'loading'}
			<p class="muted" role="status">Menyiapkan Canvas Pixel…</p>
		{:else if view.kind === 'trash'}
			<h1>Karya ini berada di Sampah</h1>
			<p>{view.purgeAfter ? `Karya dijadwalkan terhapus pada ${formatDate(view.purgeAfter)}.` : 'Karya ini tidak lagi tersedia.'}</p>
			<a class="btn btn-primary" href="/works">Kembali ke Karyaku</a>
		{:else}
			<h1>Karya belum dapat dibuka</h1>
			<p>{view.message}</p>
			<a class="btn btn-primary" href="/works">Kembali ke Karyaku</a>
		{/if}
	</main>
{/if}

<style>
	.state {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 16px;
		padding: 80px 16px;
	}
	h1 {
		font-size: var(--text-xl);
	}
</style>
