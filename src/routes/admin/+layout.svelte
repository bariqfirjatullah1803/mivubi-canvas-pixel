<script lang="ts">
	// Kerangka Admin: rail kiri tetap + area kerja (PRD §7.2, DESIGN §13).
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Brand from '$lib/components/Brand.svelte';
	import { adminLogout, adminSession } from '$lib/store';
	import { setTheme, theme } from '$lib/ui.svelte';

	let { children } = $props();
	const isLogin = $derived(page.url.pathname === '/admin/login');
	// null = belum dicek. Dicek ulang tiap pindah halaman, jadi sesi yang kedaluwarsa ketahuan.
	let admin = $state<boolean | null>(null);
	const allowed = $derived(isLogin || admin === true);

	$effect(() => {
		void page.url.pathname;
		adminSession()
			.then((v) => (admin = v))
			.catch(() => (admin = false));
	});

	$effect(() => {
		if (admin === false && !isLogin) goto('/admin/login', { replaceState: true });
	});

	const links: [string, string, string][] = [
		['/admin', 'Ringkasan', 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
		['/admin/artworks', 'Moderasi', 'M12 3l8 4v5c0 5-3.4 8.4-8 9.7C7.4 20.4 4 17 4 12V7z'],
		['/admin/templates', 'Referensi', 'M12 3l2.2 5.3L20 10l-5.8 1.7L12 17l-2.2-5.3L4 10l5.8-1.7z'],
		['/admin/posters', 'Poster', 'M4 5h16v14H4zM4 15l4-4 3 3 4-5 5 6'],
		['/admin/settings', 'Pengaturan', 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM4 12h2M18 12h2M12 4v2M12 18v2']
	];

	async function signOut() {
		await adminLogout().catch(() => {});
		admin = false;
		goto('/admin/login');
	}
</script>

<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>

{#if allowed}
	<div class="shell" class:bare={isLogin}>
		{#if !isLogin}
			<aside class="rail">
				<div class="mark">
					<Brand />
					<span class="tag">Admin</span>
				</div>

				<nav aria-label="Navigasi Admin">
					{#each links as [href, label, d] (href)}
						<a {href} aria-current={page.url.pathname === href ? 'page' : undefined}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
								<path {d} stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							{label}
						</a>
					{/each}
				</nav>

				<div class="foot">
					<button
						class="swap"
						aria-label={theme.value === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
						onclick={(e) => setTheme(theme.value === 'dark' ? 'light' : 'dark', { x: e.clientX, y: e.clientY })}
					>
						{theme.value === 'dark' ? '☀' : '☾'}
					</button>
					<div class="themes" role="group" aria-label="Tema tampilan">
						<button
							aria-pressed={theme.value === 'light'}
							onclick={(e) => setTheme('light', { x: e.clientX, y: e.clientY })}>Terang</button
						>
						<button aria-pressed={theme.value === 'dark'} onclick={(e) => setTheme('dark', { x: e.clientX, y: e.clientY })}>Gelap</button>
					</div>
					<a class="site" href="/">Lihat situs publik</a>
					<button class="btn btn-secondary" onclick={signOut}>Keluar</button>
				</div>
			</aside>
		{/if}

		<main class="work">{@render children()}</main>
	</div>
{/if}

<style>
	.shell {
		min-height: 100dvh;
		display: grid;
		grid-template-columns: 248px minmax(0, 1fr);
	}
	.shell.bare {
		grid-template-columns: minmax(0, 1fr);
	}
	/* Halaman masuk mengisi layar sendiri, tanpa padding area kerja. */
	.shell.bare .work {
		padding: 0;
	}

	/* Rail kiri: navigasi tetap terlihat sepanjang sesi moderasi. */
	.rail {
		position: sticky;
		top: 0;
		align-self: start;
		height: 100dvh;
		display: grid;
		grid-template-rows: auto 1fr auto;
		gap: 24px;
		padding: 20px 16px;
		border-right: var(--outline-thin);
		background: var(--bg);
	}
	.mark {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.tag {
		padding: 2px 8px;
		border: var(--outline-thin);
		border-radius: var(--radius-xs);
		font-size: var(--text-xs);
		font-weight: 700;
		background: var(--highlight);
	}
	nav {
		display: grid;
		align-content: start;
		gap: 4px;
	}
	nav a {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		padding: 0 12px;
		border: 1.5px solid transparent;
		border-radius: var(--radius-sm);
		color: var(--ink);
		text-decoration: none;
		font-weight: 500;
	}
	nav a:hover {
		background: var(--highlight);
	}
	nav a[aria-current='page'] {
		background: var(--section-green);
		border-color: var(--outline);
		font-weight: 600;
	}
	.foot {
		display: grid;
		gap: 10px;
	}
	.themes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2px;
		padding: 3px;
		border: var(--outline-thin);
		border-radius: 999px;
	}
	.themes button {
		min-height: 34px;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.themes button[aria-pressed='true'] {
		background: var(--section-green);
		box-shadow: inset 0 0 0 1.5px var(--outline);
		font-weight: 600;
	}
	.site {
		font-size: var(--text-sm);
		font-weight: 500;
	}
	/* Tombol tema ringkas: hanya dipakai saat rail jadi bilah atas. */
	.swap {
		display: none;
		width: 40px;
		height: 40px;
		border: var(--outline-thin);
		border-radius: 999px;
		background: var(--bg);
		color: var(--ink);
		font-size: 17px;
		line-height: 1;
		cursor: pointer;
	}

	.work {
		min-width: 0;
		padding: 32px 32px 64px;
		display: grid;
		/* Kolom eksplisit: tanpa ini kolom implisit ikut max-content dan halaman melebar. */
		grid-template-columns: minmax(0, 1fr);
		align-content: start;
		gap: 24px;
	}
	.work :global(h1) {
		font-size: var(--text-xl);
	}

	/* Di bawah 900 px rail menjadi bilah atas dua baris: identitas + aksi, lalu strip navigasi. */
	@media (max-width: 900px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
		}
		.rail {
			position: sticky;
			top: 0;
			z-index: 5;
			height: auto;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-rows: auto auto;
			align-items: center;
			gap: 10px 8px;
			padding: 10px 16px;
			border-right: 0;
			border-bottom: var(--outline-thin);
		}
		nav {
			grid-column: 1 / -1;
			grid-row: 2;
			display: flex;
			gap: 6px;
			overflow-x: auto;
			scrollbar-width: none;
			margin: 0 -16px;
			padding: 0 16px;
		}
		nav::-webkit-scrollbar {
			display: none;
		}
		nav a {
			flex: none;
			min-height: 40px;
			padding: 0 14px;
			border-color: var(--outline);
			border-radius: 999px;
			white-space: nowrap;
		}
		.mark {
			grid-area: 1 / 1;
		}
		.foot {
			grid-area: 1 / 2;
			grid-auto-flow: column;
			align-items: center;
			gap: 8px;
		}
		.swap {
			display: grid;
			place-items: center;
		}
		.themes,
		.site {
			display: none;
		}
		.foot :global(.btn) {
			min-height: 40px;
			padding: 0 14px;
		}
		.work {
			padding: 20px 16px 48px;
		}
	}
	@media (max-width: 560px) {
		/* Tanpa ikon, ketiga tautan muat dalam satu baris tanpa perlu digeser. */
		nav a svg {
			display: none;
		}
		nav a {
			padding: 0 12px;
		}
	}
</style>
