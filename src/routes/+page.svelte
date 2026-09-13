<script lang="ts">
	// Landing page setinggi layar: papan komunitas bergerak sebagai latar, navbar melayang,
	// teks + CTA di tengah (PRD F1–F2).
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import Brand from '$lib/components/Brand.svelte';
	import HeroBoard from '$lib/components/HeroBoard.svelte';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import Studio from '$lib/components/Studio.svelte';
	import { createProject, type Project } from '$lib/grid';
	import { createCloudProject, getSettings, saveDraft, type ApiError, type Meta, type Settings } from '$lib/store';
	import { refreshAuth, toast } from '$lib/ui.svelte';

	let settings: Settings | null = $state(null);
	let session: { project: Project; meta: Meta } | null = $state(null);
	let busy = $state(false);
	let error: string | null = $state(null);

	$effect(() => {
		getSettings()
			.then((s) => (settings = s))
			.catch((e: ApiError) => (error = e.message));
		refreshAuth();
	});

	const inStudio = $derived(!!page.state.entered && !!session);

	// Tombol Back browser kembali ke landing; mulai lagi selalu membuat draf baru (PRD F2 butir 8).
	$effect(() => {
		if (!page.state.entered && session) session = null;
	});

	async function start() {
		if (busy) return;
		busy = true;
		error = null;
		try {
			const s = await getSettings();
			settings = s;
			const p = createProject(s.canvas, s.palette);
			const localOk = saveDraft(p);
			const meta = await createCloudProject(p);
			session = { project: p, meta };
			pushState(`/project/${p.id}`, { entered: true });
			if (!localOk) toast('Draf sudah tersimpan di cloud, tetapi cadangan perangkat belum dapat dibuat.');
			play();
		} catch (e) {
			error = (e as ApiError).message;
		} finally {
			busy = false;
		}
	}

	// Masuk Studio: layar memudar masuk, lalu header, toolbar, dan rak muncul bertahap.
	async function play() {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		await tick();
		const root = document.querySelector<HTMLElement>('.studio');
		if (!root) return;
		root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
		root.querySelectorAll<HTMLElement>('[data-chrome]').forEach((el, i) =>
			el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], {
				duration: 320,
				delay: 200 + i * 80,
				easing: 'ease-out',
				fill: 'backwards'
			})
		);
	}
</script>

{#if inStudio && session}
	{#key session.project.id}
		<Studio initial={session.project} initialMeta={session.meta} autoTourDelay={900} onback={() => history.back()} />
	{/key}
{:else}
	<div class="landing">
		<header class="top">
			<span class="pill"><Brand /></span>
			<div class="group">
				<nav aria-label="Navigasi utama">
					<a href="/world">Canvas World</a>
					<a href="/works">Karyaku</a>
				</nav>
				<ProfileMenu />
			</div>
		</header>

		<main class="hero" aria-labelledby="hero-title">
			<HeroBoard />
			<div class="glow" aria-hidden="true"></div>
			<div class="intro">
				<h1 id="hero-title"><span>Block</span> <span>Unblock</span></h1>
				<p class="lead">Susun warna, tuangkan idemu, dan jadi bagian dari dunia yang kita buat bersama.</p>
				<button class="btn btn-primary cta" disabled={busy || !settings} onclick={start}>
					{busy ? 'Menyiapkan studio…' : 'Mulai dari papan kosong'}
				</button>
				{#if error}
					<div class="banner" role="alert">
						<p>{error}</p>
						<button class="btn btn-text" onclick={() => (error = null)}>Tutup</button>
					</div>
				{/if}
			</div>
		</main>
	</div>
{/if}

<style>
	/* Papan selalu ivory, jadi landing memakai palet terang walau tema gelap dipilih.
	   Setinggi layar, tanpa scroll. */
	.landing {
		--bg: #fffef5;
		--panel: #fffef5;
		--section-blue: #d8eeff;
		--section-green: #e1f0cf;
		--highlight: #fff0b3;
		--primary: #08783f;
		--on-primary: #fffef5;
		--ink: #153d2b;
		--outline: #153d2b;
		--muted: #506d5e;
		--line: #d0d7cd;
		--danger: #a63e2d;
		--focus: #08783f;
		--glow: 251 250 244;
		position: relative;
		height: 100dvh;
		overflow: hidden;
		color: var(--ink);
		background: var(--board-ivory);
	}

	/* Navbar melayang: pil di atas papan, dengan fade ivory tipis di belakangnya. */
	.top {
		position: absolute;
		inset: 0 0 auto;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 20px 24px 44px;
		background: linear-gradient(rgb(var(--glow) / 0.95) 35%, rgb(var(--glow) / 0));
		pointer-events: none;
	}
	.top > * {
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

	/* Papan komunitas memenuhi seluruh layar sampai tepi. */
	.hero {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 96px 16px 24px;
		overflow: hidden;
	}
	/* Cahaya lembut di tengah: blok memudar saat mendekati tulisan. */
	.glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			ellipse 46% 56% at 50% 52%,
			rgb(var(--glow)) 0%,
			rgb(var(--glow) / 0.96) 45%,
			rgb(var(--glow) / 0.7) 68%,
			rgb(var(--glow) / 0) 100%
		);
	}
	.intro {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 20px;
		max-width: 680px;
		padding: 40px 48px;
		text-align: center;
	}
	.intro > :not(.banner) {
		text-shadow:
			0 0 12px rgb(var(--glow)),
			0 0 4px rgb(var(--glow));
	}
	/* Font pixel hanya di hero; ukuran kelipatan 10px agar pixel tetap tajam.
	   Huruf kapital Display setinggi 0,5em, jadi baris dirapatkan ke 0,8em. */
	h1 {
		font-family: 'MIVUBI Blok Display', var(--font);
		font-size: 80px;
		font-weight: 400;
		line-height: 0.8;
	}
	h1 span {
		display: block;
	}
	.lead {
		font-family: 'MIVUBI Blok', var(--font);
		font-size: 20px;
		line-height: 1.6;
		max-width: 36ch;
	}
	/* Tombol "blok": font pixel, sudut hampir kotak, bayangan keras seperti blok magnet
	   yang menonjol. Saat ditekan, tombol turun menempel ke papan. */
	.cta {
		min-height: 56px;
		padding: 0 28px;
		font-family: 'MIVUBI Blok', var(--font);
		font-size: 20px;
		font-weight: 700;
		border: 2px solid var(--ink);
		border-radius: var(--radius-xs);
		box-shadow: 4px 4px 0 var(--ink);
		text-shadow: none !important;
		transition:
			transform 0.08s ease-out,
			box-shadow 0.08s ease-out,
			background-color 0.15s;
	}
	.cta:active:not(:disabled) {
		transform: translate(4px, 4px);
		box-shadow: 0 0 0 var(--ink);
	}
	@media (max-width: 1000px) {
		h1 {
			font-size: 70px;
		}
	}
	@media (max-width: 600px) {
		.top {
			padding: 12px 16px 36px;
		}
		nav {
			display: none;
		}
		.hero {
			padding-top: 80px;
		}
		.intro {
			padding: 28px 20px;
			gap: 16px;
		}
		.glow {
			background: radial-gradient(
				ellipse 75% 50% at 50% 52%,
				rgb(var(--glow)) 0%,
				rgb(var(--glow) / 0.96) 55%,
				rgb(var(--glow) / 0.7) 75%,
				rgb(var(--glow) / 0) 100%
			);
		}
		h1 {
			font-size: 50px;
		}
		.cta {
			width: 100%;
			padding: 0 16px;
			font-weight: 400;
		}
	}
	@media (max-width: 400px) {
		h1 {
			font-size: 30px;
		}
		.hero {
			padding: 72px 12px 16px;
		}
		.intro {
			padding: 24px 16px;
		}
		.cta {
			white-space: normal;
			line-height: 1.3;
			padding: 10px 16px;
		}
	}
</style>
