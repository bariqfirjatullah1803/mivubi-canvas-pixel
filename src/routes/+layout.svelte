<script lang="ts">
	import '@fontsource-variable/plus-jakarta-sans';
	import '../app.css';
	import { applyTheme, toasts } from '$lib/ui.svelte';

	let { children } = $props();

	$effect(() => {
		applyTheme();
		const sync = () => applyTheme(); // ikut berubah kalau tema diganti di tab lain
		window.addEventListener('storage', sync);
		return () => window.removeEventListener('storage', sync);
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="/fonts/mivubi-blok.css" />
	<title>MIVUBI Canvas Pixel</title>
</svelte:head>

{@render children()}

<div class="toasts" role="status" aria-live="polite">
	{#each toasts as t (t.id)}
		<div class="toast">
			<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
				><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" /></svg
			>
			{t.text}
		</div>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		left: 50%;
		bottom: 24px;
		transform: translateX(-50%);
		display: grid;
		gap: 8px;
		z-index: 100;
		width: max-content;
		max-width: calc(100vw - 32px);
		pointer-events: none;
	}
	.toast {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
		font-weight: 500;
		animation: rise 0.2s ease-out;
	}
	@keyframes rise {
		from {
			transform: translateY(8px);
			opacity: 0;
		}
	}
</style>
