<script lang="ts">
	// Masuk Admin: kartu blok di atas kertas grid, sekeluarga dengan halaman akun
	// tetapi tanpa nada promosi (DESIGN §13.6).
	import { goto } from '$app/navigation';
	import Brand from '$lib/components/Brand.svelte';
	import { adminLogin, adminSession, type ApiError } from '$lib/store';

	let password = $state('');
	let error: string | null = $state(null);
	let busy = $state(false);

	$effect(() => {
		adminSession()
			.then((v) => {
				if (v) goto('/admin', { replaceState: true });
			})
			.catch(() => {});
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = null;
		try {
			await adminLogin(password);
			goto('/admin');
		} catch (err) {
			error = (err as ApiError).message;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Masuk Admin · MIVUBI</title></svelte:head>

<div class="wrap grid-field">
	<form class="panel blok" onsubmit={submit}>
		<div class="bar">
			<Brand />
			<span class="tag">Admin</span>
		</div>

		<div class="inner">
			<div class="head">
				<h1>Masuk Admin</h1>
				<p class="muted">Kelola papan, palet, dan moderasi Canvas World.</p>
			</div>
			<div class="field">
				<label for="admin-pass">Password Admin</label>
				<input
					id="admin-pass"
					type="password"
					bind:value={password}
					autocomplete="current-password"
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={error ? 'admin-error' : undefined}
				/>
			</div>
			{#if error}<p class="err" id="admin-error" role="alert">{error}</p>{/if}
			<button class="btn btn-primary blok" disabled={!password || busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
			<a class="back" href="/">← Kembali ke situs publik</a>
		</div>
	</form>
</div>

<style>
	.wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 24px 16px;
	}
	.panel {
		width: min(400px, 100%);
		display: grid;
		background: var(--bg);
		overflow: hidden;
	}
	/* Bilah identitas: penanda bahwa ini pintu belakang, bukan halaman publik. */
	.bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: var(--section-green);
		border-bottom: 2px solid var(--outline);
	}
	.tag {
		padding: 2px 8px;
		border: var(--outline-thin);
		border-radius: var(--radius-xs);
		font-size: var(--text-xs);
		font-weight: 700;
		background: var(--bg);
	}
	.inner {
		display: grid;
		gap: 18px;
		padding: 24px 20px;
	}
	.head {
		display: grid;
		gap: 6px;
	}
	h1 {
		font-family: 'MIVUBI Blok', var(--font);
		font-size: 20px;
		font-weight: 700;
		line-height: 1.3;
	}
	.err {
		color: var(--danger);
		font-weight: 500;
	}
	.back {
		justify-self: center;
		font-size: var(--text-sm);
		font-weight: 500;
	}
</style>
