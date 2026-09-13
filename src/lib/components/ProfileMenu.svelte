<script lang="ts">
	import { goto } from '$app/navigation';
	import { logout } from '$lib/store';
	import { auth, setTheme, theme, toast, type Theme } from '$lib/ui.svelte';

	let {
		beforeLeave = async () => true,
		onhelp,
		ontour
	}: { beforeLeave?: () => Promise<boolean>; onhelp?: () => void; ontour?: () => void } = $props();

	let open = $state(false);
	let root: HTMLElement | undefined = $state();
	let trigger: HTMLButtonElement | undefined = $state();
	const panelId = `profile-${Math.random().toString(36).slice(2, 8)}`;
	const themes: [Theme, string][] = [
		['light', 'Terang'],
		['dark', 'Gelap']
	];

	function close(focus = false) {
		open = false;
		if (focus) trigger?.focus();
	}

	$effect(() => {
		if (!open) return;
		const down = (e: PointerEvent) => {
			if (!root?.contains(e.target as Node)) close();
		};
		const key = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close(true);
		};
		document.addEventListener('pointerdown', down);
		document.addEventListener('keydown', key);
		return () => {
			document.removeEventListener('pointerdown', down);
			document.removeEventListener('keydown', key);
		};
	});

	async function go(e: MouseEvent, href: string) {
		e.preventDefault();
		if (!(await beforeLeave())) return;
		close();
		goto(href);
	}

	async function signOut() {
		if (!(await beforeLeave())) return;
		await logout();
		auth.user = null;
		close();
		toast('Kamu sudah keluar.');
		goto('/');
	}

	const next = () => encodeURIComponent(location.pathname);
</script>

<div
	class="menu"
	bind:this={root}
	onfocusout={(e) => {
		// relatedTarget kosong berarti fokus hilang sesaat (mis. menekan label radio),
		// bukan pindah ke luar menu. Menutup di sini membatalkan klik yang sedang berjalan.
		const to = e.relatedTarget as Node | null;
		if (open && to && !root?.contains(to)) close();
	}}
>
	<button bind:this={trigger} class="trigger" aria-expanded={open} aria-controls={panelId} onclick={() => (open = !open)}>
		<span class="avatar" aria-hidden="true">
			{#if auth.user}{auth.user.username[0].toUpperCase()}{:else}
				<svg width="16" height="16" viewBox="0 0 24 24"
					><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2" /><path
						d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					/></svg
				>{/if}
		</span>
		<span class="who">{auth.user?.username ?? 'Tamu'}</span>
		<svg class="chev" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"
			><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" /></svg
		>
	</button>

	{#if open}
		<div class="panel" id={panelId}>
			<p class="hello">
				{#if auth.user}Halo, {auth.user.username}{:else}Berkarya tanpa akun juga bisa.{/if}
			</p>
			<a href="/works" onclick={(e) => go(e, '/works')}>Karyaku</a>
			<a href="/world" onclick={(e) => go(e, '/world')}>Canvas World</a>
			{#if !auth.user}
				<a href="/account?mode=login" onclick={(e) => go(e, `/account?mode=login&next=${next()}`)}>Masuk</a>
				<a href="/account?mode=signup" onclick={(e) => go(e, `/account?mode=signup&next=${next()}`)}>Daftar</a>
			{/if}
			<fieldset>
				<legend>Tema tampilan</legend>
				<div class="themes" role="group" aria-label="Tema tampilan">
					{#each themes as [value, label] (value)}
						<button
							type="button"
							class="theme"
							aria-pressed={theme.value === value}
							onclick={(e) => setTheme(value, { x: e.clientX, y: e.clientY })}
						>
							{label}
						</button>
					{/each}
				</div>
			</fieldset>
			{#if ontour}<button
					onclick={() => {
						close();
						ontour();
					}}>Tutorial</button
				>{/if}
			{#if onhelp}<button
					onclick={() => {
						close();
						onhelp();
					}}>Pintasan keyboard</button
				>{/if}
			{#if auth.user}<button class="out" onclick={signOut}>Keluar</button>{/if}
		</div>
	{/if}
</div>

<style>
	.menu {
		position: relative;
	}
	.trigger {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 10px 0 4px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: 999px;
		cursor: pointer;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--section-blue);
		border: var(--outline-thin);
		font-weight: 700;
		font-size: var(--text-sm);
	}
	.who {
		font-weight: 500;
		font-size: var(--text-sm);
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.panel {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		z-index: 50;
		width: 260px;
		display: grid;
		padding: 8px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
	}
	.hello {
		padding: 8px 10px 10px;
		color: var(--muted);
		font-size: var(--text-sm);
		border-bottom: 1px solid var(--line);
		margin-bottom: 4px;
	}
	.panel a,
	.panel > button {
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0 10px;
		border-radius: var(--radius-sm);
		color: var(--ink);
		text-decoration: none;
		background: none;
		border: 0;
		text-align: left;
		cursor: pointer;
	}
	.panel a:hover,
	.panel > button:hover {
		background: var(--highlight);
	}
	.out {
		border-top: 1px solid var(--line) !important;
		border-radius: 0 !important;
		margin-top: 4px;
	}
	fieldset {
		border: 0;
		margin: 4px 0;
		padding: 6px 10px;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	legend {
		font-size: var(--text-xs);
		color: var(--muted);
		padding: 6px 0 0;
		float: left;
		width: 100%;
	}
	.themes {
		clear: both;
		display: flex;
		gap: 4px;
		padding-top: 6px;
	}
	.theme {
		flex: 1;
		display: grid;
		place-items: center;
		min-height: 40px;
		background: var(--bg);
		color: var(--ink);
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.theme:hover {
		background: var(--highlight);
	}
	.theme[aria-pressed='true'] {
		background: var(--section-green);
		border: var(--outline-strong);
		font-weight: 600;
	}
	@media (max-width: 400px) {
		.who {
			display: none;
		}
	}
</style>
