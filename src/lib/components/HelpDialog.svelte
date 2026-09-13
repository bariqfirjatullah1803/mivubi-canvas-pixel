<script lang="ts">
	// Pintasan keyboard (PRD Lampiran B).
	import Modal from './Modal.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();
	const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
	const rows: [string, string, string][] = [
		['Pilih warna 1–8', '1 – 8', 'Tidak'],
		['Pasang blok', 'B', 'Tidak'],
		['Hapus', 'E', 'Tidak'],
		['Geser papan', 'H', 'Tidak'],
		['Urungkan', `${mod} Z`, 'Tidak'],
		['Ulangi', `${mod} Shift Z / ${mod} Y`, 'Tidak'],
		['Pilih sel (mode Geser: geser papan)', '← ↑ ↓ →', 'Ya'],
		['Pakai alat aktif', 'Enter / Space', 'Ya'],
		['Hapus sel', 'Delete / Backspace', 'Ya'],
		['Zoom', '+ / −', 'Ya'],
		['Fit', '0', 'Ya']
	];
</script>

<Modal bind:open label="Pintasan keyboard">
	<div class="dlg-body">
		<h2>Pintasan keyboard</h2>
		<table>
			<thead><tr><th>Aksi</th><th>Tombol</th><th>Butuh fokus papan</th></tr></thead>
			<tbody>
				{#each rows as [a, k, f] (a)}
					<tr><td>{a}</td><td><kbd>{k}</kbd></td><td>{f}</td></tr>
				{/each}
			</tbody>
		</table>
		<p class="muted">Klik atau ketuk untuk memasang, tarik untuk menggambar. Tombol tengah mouse atau mode Geser untuk menggeser. {mod} + scroll untuk zoom. Dua jari untuk geser dan cubit.</p>
		<div class="dlg-actions"><button class="btn btn-primary" onclick={() => (open = false)}>Mengerti</button></div>
	</div>
</Modal>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		text-align: left;
		padding: 8px 6px;
		border-bottom: 1px solid var(--line);
	}
	th {
		font-weight: 600;
	}
	kbd {
		font-family: inherit;
		font-weight: 600;
		padding: 2px 6px;
		border: var(--outline-thin);
		border-radius: var(--radius-xs);
		background: var(--highlight);
		white-space: nowrap;
	}
</style>
