<script lang="ts">
	// Akun kreator: daftar / masuk / keluar (PRD F8, DESIGN §7.7).
	// Satu kartu blok di atas kertas grid; tidak ada panel promosi terpisah.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { login, logout, signup, type ApiError } from '$lib/store';
	import { auth, refreshAuth, toast } from '$lib/ui.svelte';

	let mode: 'signup' | 'login' = $state(page.url.searchParams.get('mode') === 'login' ? 'login' : 'signup');
	let username = $state('');
	let password = $state('');
	let error: string | null = $state(null);
	let busy = $state(false);

	// Rel warna di kepala kartu: kutipan palet merek, seperti rak warna di Studio.
	const RAIL = ['var(--section-blue)', 'var(--section-green)', 'var(--highlight)', 'var(--primary)', 'var(--ink)'];

	// SEC-10: hanya path relatif; tolak "//" dan "\".
	const next = $derived.by(() => {
		const n = page.url.searchParams.get('next') ?? '/works';
		return n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : '/works';
	});
	const ready = $derived([...username.trim()].length >= 3 && password.length >= 8);

	$effect(() => {
		refreshAuth();
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = null;
		try {
			const r = mode === 'signup' ? await signup(username, password) : await login(username, password);
			auth.user = r.user;
			// T7: toast global tetap tampil setelah pindah halaman.
			toast(
				r.claimed
					? `${r.claimed} draf dari perangkat ini sudah terhubung ke akunmu.`
					: mode === 'signup'
						? 'Akun dibuat.'
						: `Halo, ${r.user.username}.`
			);
			goto(next);
		} catch (err) {
			error = (err as ApiError).message;
		} finally {
			busy = false;
		}
	}

	async function signOut() {
		await logout();
		await refreshAuth();
		mode = 'login';
		toast('Kamu sudah keluar.');
	}
</script>

<svelte:head><title>Akun · MIVUBI Canvas Pixel</title><meta name="robots" content="noindex" /></svelte:head>

<div class="auth grid-field">
	<SiteHeader current="account" />

	<main class="stage">
		<section class="panel blok">
			<div class="rail" aria-hidden="true">
				{#each RAIL as c (c)}<span style:background={c}></span>{/each}
			</div>

			<div class="inner">
				{#if auth.user}
					<div class="head">
						<h1>Halo, {auth.user.username}.</h1>
						<p class="muted">Karyamu tersimpan di akun ini dan bisa dibuka dari perangkat lain.</p>
					</div>
					<div class="stack">
						<a class="btn btn-primary blok" href="/works">Buka Karyaku</a>
						<a class="btn btn-secondary" href="/">Buat karya baru</a>
						<button class="btn btn-text" onclick={signOut}>Keluar</button>
					</div>
				{:else}
					<div class="tabs" role="tablist" aria-label="Pilih aksi akun">
						<button role="tab" aria-selected={mode === 'signup'} class:on={mode === 'signup'} onclick={() => ((mode = 'signup'), (error = null))}>
							Daftar
						</button>
						<button role="tab" aria-selected={mode === 'login'} class:on={mode === 'login'} onclick={() => ((mode = 'login'), (error = null))}>
							Masuk
						</button>
					</div>

					<form onsubmit={submit} class="stack">
						<div class="head">
							<h1>{mode === 'signup' ? 'Amankan karyamu.' : 'Lanjutkan karyamu.'}</h1>
							<p class="muted">
								{mode === 'signup'
									? 'Satu username untuk membuka semua karyamu. Tanpa email.'
									: 'Masuk dengan username yang kamu pakai waktu mendaftar.'}
							</p>
						</div>
						<div class="field">
							<label for="acc-user">Username</label>
							<input
								id="acc-user"
								bind:value={username}
								autocomplete="username"
								maxlength="30"
								aria-invalid={error ? 'true' : undefined}
								aria-describedby={error ? 'acc-error' : 'acc-user-help'}
							/>
							<span class="help" id="acc-user-help">3–30 karakter.</span>
						</div>
						<div class="field">
							<label for="acc-pass">Password</label>
							<input
								id="acc-pass"
								type="password"
								bind:value={password}
								autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
								maxlength="128"
								aria-invalid={error ? 'true' : undefined}
								aria-describedby={error ? 'acc-error' : 'acc-pass-help'}
							/>
							<span class="help" id="acc-pass-help">Minimal 8 karakter.</span>
						</div>
						{#if mode === 'signup'}
							<p class="note">Catat password-mu. Versi ini belum menyediakan pemulihan password lewat email.</p>
						{/if}
						{#if error}<p class="err" id="acc-error" role="alert">{error}</p>{/if}
						<button class="btn btn-primary blok" disabled={!ready || busy}>
							{busy ? 'Memproses…' : mode === 'signup' ? 'Buat akun & simpan' : 'Masuk'}
						</button>
						<p class="muted foot">Draf dari perangkat ini otomatis terhubung setelah kamu {mode === 'signup' ? 'mendaftar' : 'masuk'}.</p>
					</form>
				{/if}
			</div>
		</section>
	</main>
</div>

<style>
	.auth {
		min-height: 100dvh;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
	}
	.stage {
		display: grid;
		place-items: center;
		padding: 16px 16px 56px;
	}
	.panel {
		width: min(420px, 100%);
		display: grid;
		background: var(--bg);
		overflow: hidden;
	}
	/* Rel warna selebar kartu, tanpa jarak: blok yang berimpit seperti di papan. */
	.rail {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		height: 10px;
		border-bottom: 2px solid var(--outline);
	}
	.inner {
		display: grid;
		gap: 18px;
		padding: 24px;
	}
	.head {
		display: grid;
		gap: 6px;
	}
	/* Judul kartu memakai font pixel, seragam dengan hero landing. */
	h1 {
		font-family: 'MIVUBI Blok', var(--font);
		font-size: 20px;
		font-weight: 700;
		line-height: 1.3;
	}
	.stack {
		display: grid;
		gap: 16px;
	}
	.tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		padding: 4px;
		border: var(--outline-thin);
		border-radius: 999px;
	}
	.tabs button {
		min-height: 38px;
		border: 0;
		border-radius: 999px;
		background: none;
		font-weight: 500;
		cursor: pointer;
	}
	.tabs button.on {
		background: var(--section-green);
		box-shadow: inset 0 0 0 1.5px var(--outline);
		font-weight: 600;
	}
	.note {
		padding: 10px 12px;
		background: var(--highlight);
		border: var(--outline-thin);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
	}
	.err {
		color: var(--danger);
		font-weight: 500;
	}
	.foot {
		font-size: var(--text-sm);
		text-align: center;
	}
	@media (max-width: 600px) {
		.stage {
			padding: 8px 12px 40px;
			align-content: start;
		}
		.inner {
			padding: 20px;
			gap: 16px;
		}
	}
</style>
