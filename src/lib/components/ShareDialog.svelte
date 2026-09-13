<script lang="ts">
	// Dialog setelah karya tersimpan: pilih desain poster, lalu unduh atau tutup (PRD F5 butir 5, FR-EXP).
	import Modal from './Modal.svelte';
	import PosterPicker from './PosterPicker.svelte';
	import { filledCount, type Project } from '$lib/grid';
	import { canvasBlob, posterFileName, renderPosterTemplate, type PosterTemplate } from '$lib/render';
	import { download } from '$lib/share';
	import { displayTitle, listPosterTemplates, type Meta } from '$lib/store';
	import { toast } from '$lib/ui.svelte';

	let { open = $bindable(false), project, meta }: { open?: boolean; project: Project; meta: Meta | null } = $props();

	let chosen = $state('');
	let busy = $state(false);
	let templates = $state<PosterTemplate[]>([]);

	// FR-POSTER-08: katalog dimuat ulang tiap dialog dibuka.
	$effect(() => {
		if (!open) return;
		listPosterTemplates()
			.then((t) => {
				templates = t;
				if (!t.some((x) => x.id === chosen)) chosen = t[0]?.id ?? '';
			})
			.catch(() => (templates = []));
	});

	const picked = $derived(templates.find((t) => t.id === chosen) ?? templates[0] ?? null);

	const info = $derived({
		title: displayTitle(meta?.title ?? project.name),
		creator: meta?.creatorName ?? null,
		social: meta?.socialHandle ?? null
	});
	const shown = $derived(meta?.visibility === 'public' && !meta.takenDownAt && filledCount(project.cells) > 0);

	async function poster() {
		return canvasBlob(await renderPosterTemplate(project, info, picked!));
	}

	async function save() {
		busy = true;
		try {
			toast(download(await poster(), posterFileName(info.title, chosen)) ? 'PNG diunduh.' : 'PNG belum dapat diunduh.');
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open label="Karya tersimpan" wide>
	<div class="dlg-body">
		<h2>Karya tersimpan</h2>
		<p class="muted">
			{#if shown}Karyamu sudah tampil di Canvas World. Mau bawa posternya juga?
			{:else if meta?.visibility === 'public'}Karyamu publik, tapi belum tampil di Canvas World. Posternya tetap bisa diunduh.
			{:else}Karyamu tersimpan privat. Kamu tetap bisa mengunduh posternya.{/if}
		</p>
		<PosterPicker {project} {info} {templates} bind:chosen />
		<div class="dlg-actions">
			<button class="btn btn-secondary" disabled={busy || !picked} onclick={save}>Unduh PNG</button>
			<button class="btn btn-primary" onclick={() => (open = false)}>Simpan</button>
		</div>
	</div>
</Modal>
