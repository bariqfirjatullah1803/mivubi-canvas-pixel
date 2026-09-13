<script module lang="ts">
	const KEY = 'mivubi.editor-tour.v1';
	export function tourDone() {
		try {
			return localStorage.getItem(KEY) === 'done';
		} catch {
			return true;
		}
	}
</script>

<script lang="ts">
	// Tutorial Studio 5 langkah dengan spotlight (PRD FR-PROF-05, Lampiran C, DESIGN §8.9).
	let { open = $bindable(false) }: { open?: boolean } = $props();

	const STEPS = [
		{
			target: 'shelf',
			title: 'Pilih blok warnamu',
			body: 'Rak ini berisi warna yang tersedia untuk karya ini. Pilih satu warna; blok yang terangkat menandakan pilihanmu.'
		},
		{
			target: 'board',
			title: 'Tempelkan ke papan',
			body: 'Klik atau ketuk satu sel untuk memasang blok. Tarik untuk menggambar beruntun. Pratinjau menempel tepat ke grid.'
		},
		{
			target: 'history',
			title: 'Bebas mencoba',
			body: 'Pilih Hapus di ujung rak untuk menghapus blok. Urungkan membatalkan satu goresan, dan Ulangi mengembalikannya.'
		},
		{
			target: 'view',
			title: 'Dekatkan detailnya',
			body: 'Pakai + dan − untuk zoom, Geser untuk menggeser papan, dan Fit untuk melihat seluruh papan. Di layar sentuh, cubit atau geser dengan dua jari.'
		},
		{
			target: 'save',
			title: 'Simpan, lalu bagikan',
			body: 'Perubahan tersimpan otomatis. Simpan & bagikan mengatur judul dan publik atau privat, lalu menyiapkan PNG atau link. Akun opsional menjaga akses dari perangkat lain.'
		}
	];

	let i = $state(0);
	let rect: DOMRect | null = $state(null);
	let vw = $state(0),
		vh = $state(0);
	let heading: HTMLElement | undefined = $state();

	function measure() {
		vw = innerWidth;
		vh = innerHeight;
		const el = document.querySelector(`[data-tour="${STEPS[i].target}"]`);
		const r = el?.getBoundingClientRect();
		rect = r && r.width ? r : null;
	}

	$effect(() => {
		if (!open) return;
		void i;
		measure();
		heading?.focus();
		const on = () => measure();
		window.addEventListener('resize', on);
		window.addEventListener('scroll', on, true);
		return () => {
			window.removeEventListener('resize', on);
			window.removeEventListener('scroll', on, true);
		};
	});

	function finish() {
		try {
			localStorage.setItem(KEY, 'done');
		} catch {
			/* tutorial tetap bisa ditutup */
		}
		open = false;
		i = 0;
	}

	const CARD = 360;
	const place = $derived.by(() => {
		const w = Math.min(CARD, vw - 32);
		if (!rect || rect.height > vh * 0.55) return { w, left: (vw - w) / 2, top: vh / 2 - 110, bottom: null };
		const left = Math.min(Math.max(16, rect.left), vw - w - 16);
		return rect.top + rect.height / 2 < vh / 2
			? { w, left, top: rect.bottom + 16, bottom: null }
			: { w, left, top: null, bottom: vh - rect.top + 16 };
	});
</script>

{#if open}
	<div
		class="tour"
		role="dialog"
		aria-modal="true"
		aria-labelledby="tour-title"
		tabindex="-1"
		onkeydown={(e) => {
			if (e.key === 'Escape') finish();
		}}
	>
		{#if rect}
			<div
				class="spot"
				style:left="{rect.left - 8}px"
				style:top="{rect.top - 8}px"
				style:width="{rect.width + 16}px"
				style:height="{rect.height + 16}px"
			></div>
		{:else}
			<div class="dim"></div>
		{/if}
		<div
			class="card"
			style:width="{place.w}px"
			style:left="{place.left}px"
			style:top={place.top === null ? null : `${place.top}px`}
			style:bottom={place.bottom === null ? null : `${place.bottom}px`}
		>
			<p class="step num">Langkah {i + 1} dari {STEPS.length}</p>
			<div class="bars" aria-hidden="true">
				{#each STEPS as s, k (s.target)}<span class:done={k <= i}></span>{/each}
			</div>
			<h2 id="tour-title" tabindex="-1" bind:this={heading}>{STEPS[i].title}</h2>
			<p>{STEPS[i].body}</p>
			<div class="actions">
				<button class="btn btn-text" onclick={finish}>Lewati</button>
				<span class="grow"></span>
				{#if i > 0}<button class="btn btn-secondary" onclick={() => i--}>Kembali</button>{/if}
				<button class="btn btn-primary" onclick={() => (i < STEPS.length - 1 ? i++ : finish())}>
					{i < STEPS.length - 1 ? 'Lanjut' : 'Selesai'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.tour {
		position: fixed;
		inset: 0;
		z-index: 80;
	}
	.tour:focus {
		outline: none;
	}
	.spot {
		position: fixed;
		border-radius: var(--radius-md);
		box-shadow: 0 0 0 9999px rgb(21 61 43 / 0.55);
		outline: 3px solid var(--highlight);
		pointer-events: none;
		transition: all 0.2s ease-out;
	}
	.dim {
		position: fixed;
		inset: 0;
		background: rgb(21 61 43 / 0.55);
	}
	.card {
		position: fixed;
		display: grid;
		gap: 10px;
		padding: 18px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
	}
	.step {
		font-size: var(--text-xs);
		color: var(--muted);
		font-weight: 500;
	}
	.bars {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
	}
	.bars span {
		height: 4px;
		border-radius: 2px;
		background: var(--line);
	}
	.bars span.done {
		background: var(--primary);
	}
	h2 {
		font-size: var(--text-lg);
	}
	h2:focus {
		outline: none;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.actions .btn-text {
		padding: 0;
	}
	.grow {
		flex: 1;
	}
</style>
