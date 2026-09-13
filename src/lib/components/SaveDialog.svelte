<script lang="ts">
	// Dialog "Simpan karya" (PRD F5, DESIGN §8.4).
	import { untrack } from 'svelte';
	import Modal from './Modal.svelte';
	import type { Meta, SaveInput, Visibility } from '$lib/store';

	let {
		open = $bindable(false),
		meta,
		name,
		guest,
		onsubmit,
		onaccount
	}: {
		open?: boolean;
		meta: Meta | null;
		name: string;
		guest: boolean;
		onsubmit: (i: SaveInput) => Promise<string | null>;
		onaccount: () => void;
	} = $props();

	let title = $state('');
	let creator = $state('');
	let social = $state('');
	let visibility: Visibility = $state('public');
	let error: string | null = $state(null);
	let busy = $state(false);
	let titleEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (!open) return;
		untrack(() => {
			title = meta?.title ?? name;
			creator = meta?.creatorName ?? '';
			social = meta?.socialHandle ?? '';
			visibility = meta?.savedAt ? meta.visibility : 'public';
			error = null;
		});
		setTimeout(() => titleEl?.select(), 0);
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = await onsubmit({ title, creatorName: creator, socialHandle: social, visibility });
		busy = false;
	}
</script>

<Modal bind:open label="Simpan karya">
	<form class="dlg-body" onsubmit={submit}>
		<h2>Siapa di balik Pixel Art ini?</h2>
		<p class="muted">Judul, nama kreator, dan akun sosial boleh dikosongkan.</p>
		<div class="field">
			<label for="sv-title">Judul karya</label>
			<input id="sv-title" bind:this={titleEl} bind:value={title} maxlength="200" placeholder="Karya tanpa judul" />
		</div>
		<div class="row">
			<div class="field">
				<label for="sv-creator">Nama kreator</label>
				<input id="sv-creator" bind:value={creator} maxlength="80" placeholder="Nama atau nama panggung" autocomplete="nickname" />
			</div>
			<div class="field">
				<label for="sv-social">Akun sosial</label>
				<input id="sv-social" bind:value={social} maxlength="120" placeholder="@username" />
			</div>
		</div>
		<fieldset class="vis">
			<legend>Siapa yang bisa melihat?</legend>
			<label class="opt" class:on={visibility === 'public'}>
				<input type="radio" name="vis" value="public" bind:group={visibility} />
				<span><strong>Publik</strong><small>Tampil di Canvas World dan dapat dibagikan.</small></span>
			</label>
			<label class="opt" class:on={visibility === 'private'}>
				<input type="radio" name="vis" value="private" bind:group={visibility} />
				<span><strong>Privat</strong><small>Hanya tersedia untuk perangkat atau akunmu.</small></span>
			</label>
		</fieldset>
		{#if guest}
			<div class="note">
				<p>
					<strong>Jangan kehilangan akses edit.</strong> Tanpa akun, akses karya bergantung pada data browser ini dan dapat hilang
					jika datanya dihapus.
				</p>
				<button type="button" class="btn btn-text" onclick={onaccount}>Buat akun opsional</button>
			</div>
		{/if}
		{#if error}<p class="err" role="alert">{error}</p>{/if}
		<div class="dlg-actions">
			<button type="button" class="btn btn-secondary" onclick={() => (open = false)}>Batal</button>
			<button class="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan karya'}</button>
		</div>
	</form>
</Modal>

<style>
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.vis {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	legend {
		font-weight: 500;
		font-size: var(--text-sm);
		margin-bottom: 8px;
		padding: 0;
	}
	.opt {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		padding: 12px;
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		cursor: pointer;
	}
	.opt:hover {
		background: var(--highlight);
	}
	.opt.on {
		border: var(--outline-strong);
		background: var(--section-green);
	}
	.opt input {
		margin-top: 4px;
		accent-color: var(--primary);
		width: 18px;
		height: 18px;
	}
	.opt span {
		display: grid;
		gap: 2px;
	}
	.opt small {
		color: var(--muted);
		font-size: var(--text-sm);
	}
	.note {
		padding: 12px 14px;
		background: var(--highlight);
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		display: grid;
		justify-items: start;
		gap: 4px;
	}
	.note .btn {
		padding: 0;
		min-height: 32px;
	}
	.err {
		color: var(--danger);
		font-weight: 500;
	}
	@media (max-width: 600px) {
		.row,
		.vis {
			grid-template-columns: 1fr;
		}
	}
</style>
