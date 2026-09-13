<script lang="ts">
	// Navbar publik: pil melayang, wordmark pixel, senada dengan landing page.
	import Brand from './Brand.svelte';
	import ProfileMenu from './ProfileMenu.svelte';

	let { current, floating = false }: { current?: 'world' | 'works' | 'account'; floating?: boolean } = $props();
</script>

<header class="site" class:floating>
	<span class="pill"><Brand /></span>
	<div class="group">
		<nav aria-label="Navigasi utama">
			<a href="/world" aria-current={current === 'world' ? 'page' : undefined}>Canvas World</a>
			<a href="/works" aria-current={current === 'works' ? 'page' : undefined}>Karyaku</a>
		</nav>
		<ProfileMenu />
	</div>
</header>

<style>
	.site {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px max(16px, env(safe-area-inset-left));
	}
	/* Di halaman yang isinya memenuhi layar (World), navbar melayang di atas isi. */
	.floating {
		position: absolute;
		inset: 0 0 auto;
		z-index: 3;
		padding-bottom: 40px;
		background: linear-gradient(color-mix(in srgb, var(--header-fade, var(--bg)) 92%, transparent) 35%, transparent);
		pointer-events: none;
	}
	.floating > * {
		pointer-events: auto;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		padding: 0 8px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: 999px;
		box-shadow: 0 6px 16px rgb(21 61 43 / 0.12);
	}
	.group {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	nav {
		display: flex;
		gap: 2px;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 14px;
		border-radius: 999px;
		color: var(--ink);
		text-decoration: none;
		font-weight: 500;
	}
	nav a:hover {
		background: var(--highlight);
	}
	nav a[aria-current='page'] {
		background: var(--section-green);
		box-shadow: inset 0 0 0 1.5px var(--outline);
	}
	@media (min-width: 601px) {
		.group {
			padding: 4px;
			background: var(--bg);
			border: var(--outline-thin);
			border-radius: 999px;
			box-shadow: 0 6px 16px rgb(21 61 43 / 0.12);
		}
		.group :global(.trigger) {
			border: 0;
			min-height: 40px;
		}
	}
	@media (max-width: 600px) {
		nav {
			display: none;
		}
	}
</style>
