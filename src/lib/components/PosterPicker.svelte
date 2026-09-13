<script lang="ts">
	// Pilihan desain poster dengan pratinjau PNG asli (PRD F5 butir 5, T1: dipakai Studio dan /art).
	import { untrack } from 'svelte';
	import type { Project } from '$lib/grid';
	import { renderPosterTemplate, type PosterInfo, type PosterTemplate } from '$lib/render';

	let {
		project,
		info,
		templates,
		chosen = $bindable(''),
		onpick
	}: {
		project: Project;
		info: PosterInfo;
		templates: PosterTemplate[];
		chosen?: string;
		onpick?: (id: string) => void;
	} = $props();

	let previews: Record<string, string> = $state({});

	$effect(() => {
		const p = project,
			i = { ...info },
			list = templates;
		untrack(() => {
			for (const t of list) renderPosterTemplate(p, i, t).then((c) => (previews[t.id] = c.toDataURL('image/png')));
		});
	});
</script>

<fieldset class="posters">
	<legend>Desain poster</legend>
	<div class="list">
		{#each templates as pr (pr.id)}
			<label class="poster" class:on={chosen === pr.id}>
				<input type="radio" name="poster" value={pr.id} bind:group={chosen} onchange={() => onpick?.(pr.id)} />
				{#if previews[pr.id]}
					<img src={previews[pr.id]} alt="Pratinjau poster {pr.name}" />
				{:else}
					<span class="ph">Menyiapkan pratinjau…</span>
				{/if}
				<span class="name">{pr.name}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}
	legend {
		font-weight: 500;
		font-size: var(--text-sm);
		margin-bottom: 8px;
		padding: 0;
	}
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
	}
	.poster {
		display: grid;
		gap: 8px;
		padding: 8px;
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		cursor: pointer;
		background: var(--bg);
	}
	.poster:hover {
		background: var(--highlight);
	}
	.poster.on {
		border: var(--outline-strong);
		background: var(--section-green);
	}
	.poster:has(input:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: 3px;
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	img,
	.ph {
		width: 100%;
		aspect-ratio: 9 / 16;
		border-radius: var(--radius-sm);
		display: grid;
		place-items: center;
		background: var(--section-blue);
		font-size: var(--text-xs);
		color: var(--muted);
	}
	.name {
		font-weight: 500;
		font-size: var(--text-sm);
	}
</style>
