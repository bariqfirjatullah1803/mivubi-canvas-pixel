<script lang="ts">
	// Galeri referensi di Studio: pilih pola, lalu tempel ke papan (PRD §13.6).
	import Modal from './Modal.svelte';
	import TemplateGrid from './TemplateGrid.svelte';
	import { templateSize, type Template } from '$lib/grid';

	let {
		open = $bindable(false),
		templates,
		boardEmpty,
		onpick
	}: {
		open?: boolean;
		templates: Template[];
		boardEmpty: boolean;
		onpick: (tpl: Template, mode: 'replace' | 'over') => void;
	} = $props();

	let pending = $state<Template | null>(null);

	function choose(t: Template) {
		// Papan kosong tidak perlu ditanya: tidak ada yang bisa hilang.
		if (boardEmpty) {
			onpick(t, 'replace');
			open = false;
			return;
		}
		pending = t;
	}

	function go(mode: 'replace' | 'over') {
		if (!pending) return;
		onpick(pending, mode);
		pending = null;
		open = false;
	}

	$effect(() => {
		if (!open) pending = null;
	});
</script>

<Modal bind:open wide label="Referensi pola">
	<div class="dlg-body">
		{#if pending}
			{@const s = templateSize(pending)}
			<h2>Papanmu sudah ada isinya</h2>
			<div class="confirm">
				<div class="prev"><TemplateGrid rows={pending.rows} colors={pending.colors} max={120} label="Pratinjau {pending.name}" /></div>
				<div>
					<p><strong>{pending.name}</strong> berukuran {s.w} × {s.h} sel dan akan dipasang di tengah papan.</p>
					<p class="muted">Ganti papan menghapus blok yang sudah ada. Menempel di atas membiarkannya. Keduanya bisa diurungkan.</p>
				</div>
			</div>
			<div class="dlg-actions">
				<button class="btn btn-text" onclick={() => (pending = null)}>Kembali</button>
				<button class="btn btn-secondary" onclick={() => go('over')}>Tempel di atas</button>
				<button class="btn btn-primary" onclick={() => go('replace')}>Ganti papan</button>
			</div>
		{:else}
			<h2>Referensi pola</h2>
			<p class="muted">Pola dipasang di tengah papan dengan warna palet terdekat. Bisa diurungkan.</p>
			<ul class="grid">
				{#each templates as t (t.id)}
					{@const s = templateSize(t)}
					<li>
						<button class="tile" onclick={() => choose(t)}>
							<span class="prev"><TemplateGrid rows={t.rows} colors={t.colors} max={120} label="" /></span>
							<span class="nm">{t.name}</span>
							<span class="muted num sz">{s.w} × {s.h}</span>
						</button>
					</li>
				{/each}
			</ul>
			<div class="dlg-actions">
				<button class="btn btn-secondary" onclick={() => (open = false)}>Tutup</button>
			</div>
		{/if}
	</div>
</Modal>

<style>
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 12px;
		max-height: min(52dvh, 420px);
		overflow-y: auto;
	}
	.tile {
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-rows: 1fr auto auto;
		justify-items: center;
		gap: 4px;
		padding: 10px;
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
	.tile:hover {
		background: var(--highlight);
	}
	.prev {
		display: grid;
		place-items: center;
		width: 100%;
		min-height: 136px;
		padding: 8px;
		border-radius: var(--radius-xs);
		background: var(--section-blue);
	}
	.nm {
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.sz {
		font-size: var(--text-xs);
	}
	.confirm {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.confirm .prev {
		width: auto;
		flex: none;
	}
	.confirm div {
		flex: 1 1 240px;
		display: grid;
		gap: 4px;
	}
</style>
