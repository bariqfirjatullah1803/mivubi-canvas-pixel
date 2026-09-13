<script lang="ts">
	// <dialog> modal native: fokus terkunci, Escape menutup kecuali closable=false (DESIGN §8.4).
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		closable = true,
		wide = false,
		label,
		children
	}: { open?: boolean; closable?: boolean; wide?: boolean; label: string; children: Snippet } = $props();

	let dlg: HTMLDialogElement | undefined = $state();
	let back: HTMLElement | null = null;

	$effect(() => {
		if (!dlg) return;
		if (open && !dlg.open) {
			back = document.activeElement as HTMLElement | null;
			dlg.showModal();
		} else if (!open && dlg.open) dlg.close();
	});
</script>

<dialog
	bind:this={dlg}
	class="dlg"
	class:wide
	aria-label={label}
	oncancel={(e) => {
		if (!closable) e.preventDefault();
	}}
	onclose={() => {
		open = false;
		back?.focus?.();
	}}
>
	{#if open}{@render children()}{/if}
</dialog>

<style>
	.wide {
		width: min(760px, calc(100vw - 32px));
	}
</style>
