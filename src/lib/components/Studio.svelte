<script lang="ts">
	// Studio: satu modul sesi karya untuk "/" dan "/project/[id]" (PRD F3–F6, T5).
	import { beforeNavigate, goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import BoardCanvas, { type Stroke, type Tool } from './BoardCanvas.svelte';
	import Brand from './Brand.svelte';
	import HelpDialog from './HelpDialog.svelte';
	import Modal from './Modal.svelte';
	import ProfileMenu from './ProfileMenu.svelte';
	import SaveDialog from './SaveDialog.svelte';
	import ShareDialog from './ShareDialog.svelte';
	import TemplatePicker from './TemplatePicker.svelte';
	import Tour, { tourDone } from './Tour.svelte';
	import { cloneProject, filledCount, templateDiff, type Project, type Template } from '$lib/grid';
	import {
		clearDraft,
		createCloudProject,
		getCloudProject,
		listTemplates,
		saveArtwork,
		saveDraft,
		updateCloudProject,
		type ApiError,
		type Meta,
		type SaveInput
	} from '$lib/store';
	import { auth, toast } from '$lib/ui.svelte';

	type SaveState = 'local' | 'saving' | 'saved' | 'error' | 'conflict';
	type Entry = Stroke & { label: string };

	let {
		initial,
		initialMeta,
		initialDirty = false,
		backup = false,
		autoTourDelay = 400,
		onback
	}: {
		initial: Project;
		initialMeta: Meta | null;
		initialDirty?: boolean;
		backup?: boolean;
		autoTourDelay?: number;
		onback: () => void;
	} = $props();

	const LABEL: Record<SaveState, string> = {
		local: 'Tersimpan di perangkat',
		saving: 'Menyimpan…',
		saved: 'Tersimpan',
		error: 'Gagal disimpan',
		conflict: 'Ada versi lebih baru'
	};

	// svelte-ignore state_referenced_locally
	let project = $state.raw(cloneProject(initial));
	// svelte-ignore state_referenced_locally
	let meta: Meta | null = $state(initialMeta);
	// svelte-ignore state_referenced_locally
	let revision = $state(initialMeta?.revision ?? 0);
	// svelte-ignore state_referenced_locally
	let saveState = $state<SaveState>(!initialMeta || backup ? 'local' : initialDirty ? 'saving' : 'saved');
	// svelte-ignore state_referenced_locally
	let banner: string | null = $state(
		backup ? 'Cloud belum dapat dijangkau. Cadangan perangkat dibuka dan tetap dapat diedit; muat ulang untuk menyambungkan kembali.' : null
	);
	let version = $state(0);
	let tool = $state<Tool>('pencil');
	let slot = $state(0);
	let showGrid = $state(true);
	let zoom = $state(1);
	let toolbarH = $state(0);
	let hist = $state({ u: 0, r: 0 });
	let saveOpen = $state(false);
	let shareOpen = $state(false);
	let conflictOpen = $state(false);
	let conflictError: string | null = $state(null);
	let helpOpen = $state(false);
	let tplOpen = $state(false);
	let tplBoardEmpty = $state(true);
	let templates = $state<Template[]>([]);
	let tourOpen = $state(false);
	let board: BoardCanvas | undefined = $state();

	const undoStack: Entry[] = [];
	let redoStack: Entry[] = [];
	const syncHist = () => (hist = { u: undoStack.length, r: redoStack.length });

	const activeName = $derived(
		tool === 'eraser' ? 'Hapus' : tool === 'pan' ? 'Geser' : (project.palette[slot]?.name ?? project.palette[slot]?.hex ?? '')
	);

	export function boardRect() {
		return board?.boardRect();
	}

	// ---------- autosave (PRD F4) ----------
	// svelte-ignore state_referenced_locally
	let dirty = initialDirty;
	let localOk = true;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let inflight: Promise<void> | null = null;

	function changed() {
		version++;
		project.updatedAt = new Date().toISOString();
		localOk = saveDraft(project);
		dirty = true;
		if (!meta || backup) {
			saveState = 'local';
			return;
		}
		if (saveState === 'conflict') return;
		saveState = 'saving';
		clearTimeout(timer);
		timer = setTimeout(() => flush(false), 1400);
	}

	/** Kirim perubahan ke cloud. drain=true menunggu sampai tidak ada perubahan tersisa. */
	async function flush(drain = true): Promise<boolean> {
		clearTimeout(timer);
		for (;;) {
			while (inflight) await inflight;
			if (!meta || backup || saveState === 'conflict') return false;
			if (!dirty) return saveState === 'saved';
			dirty = false;
			saveState = 'saving';
			const snap = cloneProject(project);
			inflight = (async () => {
				try {
					const r = await updateCloudProject(snap.id, snap, revision);
					revision = r.revision;
					if (meta) meta = { ...meta, revision: r.revision };
					if (!dirty) {
						saveState = 'saved';
						clearDraft(snap.id);
						banner = null;
					}
				} catch (e) {
					dirty = true;
					const err = e as ApiError;
					if (err.status === 409) {
						saveState = 'conflict';
						conflictOpen = true;
					} else {
						saveState = 'error';
						banner = localOk
							? 'Autosave cloud gagal. Draf tetap aman di perangkat ini.'
							: 'Autosave cloud dan cadangan perangkat gagal. Jangan tutup halaman ini.';
					}
				}
			})();
			await inflight;
			inflight = null;
			const after = saveState as SaveState;
			if (after === 'error' || after === 'conflict') return false;
			if (!dirty) return true;
			if (!drain) {
				timer = setTimeout(() => flush(false), 1400);
				return false;
			}
		}
	}

	// Draf lokal yang lebih baru langsung dikirim (PRD §8.8 butir 2).
	// svelte-ignore state_referenced_locally
	if (initialDirty && initialMeta && !backup) timer = setTimeout(() => flush(false), 300);

	$effect(() => {
		const hide = () => document.visibilityState === 'hidden' && flush();
		const leave = () => flush();
		document.addEventListener('visibilitychange', hide);
		window.addEventListener('pagehide', leave);
		return () => {
			document.removeEventListener('visibilitychange', hide);
			window.removeEventListener('pagehide', leave);
		};
	});

	// T17: setiap jalan keluar dari Studio melakukan flush.
	beforeNavigate(() => void flush());
	onDestroy(() => void flush());

	async function beforeLeave() {
		const ok = await flush();
		if (!ok && (saveState === 'error' || saveState === 'conflict')) {
			banner = 'Perubahan belum tersimpan di cloud. Selesaikan penyimpanan atau konflik sebelum beralih akun.';
			return false;
		}
		return true;
	}

	// ---------- referensi pola (PRD §13.6) ----------
	$effect(() => {
		listTemplates()
			.then((t) => (templates = t))
			.catch(() => (templates = [])); // galeri kosong lebih baik daripada galat di editor
	});

	// project adalah $state.raw: isi sel tidak dilacak, jadi hitung ulang saat galeri dibuka.
	function openTemplates() {
		tplBoardEmpty = filledCount(project.cells) === 0;
		tplOpen = true;
	}

	/** Tempel pola sebagai satu langkah, jadi Urungkan mengembalikan papan seperti semula. */
	function stamp(tpl: Template, mode: 'replace' | 'over') {
		const d = templateDiff(project, tpl, mode);
		if (!d.idx.length) {
			toast('Papan sudah sama dengan referensi itu.');
			return;
		}
		d.idx.forEach((i, k) => (project.cells[i] = d.after[k]));
		undoStack.push({ ...d, tool: 'pencil', label: `Referensi ${tpl.name}` });
		if (undoStack.length > 200) undoStack.shift();
		redoStack = [];
		syncHist();
		changed();
		board?.fit();
		toast(`Referensi "${tpl.name}" ditempel.`);
	}

	// ---------- riwayat (FR-TOOLS-05) ----------
	function onstroke(s: Stroke) {
		undoStack.push({ ...s, label: s.tool === 'eraser' ? 'Hapus blok' : 'Pasang blok' });
		if (undoStack.length > 200) undoStack.shift(); // ponytail: batas 200 goresan, bukan 50 MB
		redoStack = [];
		syncHist();
		changed();
	}

	function step(from: Entry[], to: Entry[], field: 'before' | 'after', verb: string) {
		const e = from.pop();
		if (!e) return;
		e.idx.forEach((i, k) => (project.cells[i] = e[field][k]));
		to.push(e);
		syncHist();
		changed();
		toast(`${verb}: ${e.label}`);
	}
	const undo = () => step(undoStack, redoStack, 'before', 'Urungkan');
	const redo = () => step(redoStack, undoStack, 'after', 'Ulangi');

	// ---------- pintasan global (FR-TOOLS-04) ----------
	$effect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.defaultPrevented || e.altKey || e.isComposing || tourOpen) return;
			const t = e.target as HTMLElement;
			if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
			if (document.querySelector('dialog[open], .panel[id^="profile-"]')) return;
			const mod = e.ctrlKey || e.metaKey;
			const k = e.key.toLowerCase();
			if (mod && k === 'z') {
				e.preventDefault();
				if (e.shiftKey) redo();
				else undo();
			} else if (mod && k === 'y') {
				e.preventDefault();
				redo();
			} else if (!mod && /^[1-8]$/.test(k) && Number(k) <= project.palette.length) {
				slot = Number(k) - 1;
				tool = 'pencil';
			} else if (!mod && k === 'b') tool = 'pencil';
			else if (!mod && k === 'e') tool = 'eraser';
			else if (!mod && k === 'h') tool = 'pan';
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	// ---------- simpan karya (PRD F5) ----------
	async function submitSave(input: SaveInput): Promise<string | null> {
		const t = input.title.trim();
		if (t && t !== project.name) {
			project.name = t;
			changed();
		}
		const ok = await flush();
		if (!meta || backup || !ok) return 'Draf cloud belum siap. Coba lagi setelah koneksi pulih.';
		try {
			const m = await saveArtwork(project.id, input, revision);
			meta = m;
			revision = m.revision;
			saveOpen = false;
			shareOpen = true;
			toast(m.visibility === 'public' ? 'Karya disimpan dan siap dibagikan.' : 'Karya disimpan privat.');
			return null;
		} catch (e) {
			const err = e as ApiError;
			if (err.status === 409) {
				saveOpen = false;
				saveState = 'conflict';
				conflictOpen = true;
				return null;
			}
			return err.message;
		}
	}

	async function goAccount() {
		if (!(await beforeLeave())) {
			saveOpen = false;
			return;
		}
		goto(`/account?mode=signup&next=${encodeURIComponent(`/project/${project.id}`)}`);
	}

	// ---------- konflik (PRD F6) ----------
	async function loadLatest() {
		conflictError = null;
		try {
			const r = await getCloudProject(project.id);
			project = r.project;
			meta = r.meta;
			revision = r.meta.revision;
			clearDraft(project.id);
			undoStack.length = 0;
			redoStack = [];
			syncHist();
			dirty = false;
			saveState = 'saved';
			banner = null;
			conflictOpen = false;
			version++;
		} catch (e) {
			conflictError = (e as ApiError).message;
		}
	}

	async function saveAsNew() {
		conflictError = null;
		const copy = cloneProject(project);
		copy.id = crypto.randomUUID();
		copy.name = `${project.name} (salinan)`.slice(0, 200);
		copy.createdAt = copy.updatedAt = new Date().toISOString();
		try {
			saveDraft(copy);
			await createCloudProject(copy);
			clearDraft(project.id);
			dirty = false;
			conflictOpen = false;
			goto(`/project/${copy.id}`, { replaceState: true });
		} catch (e) {
			conflictError = (e as ApiError).message;
		}
	}

	async function back() {
		await flush();
		onback();
	}

	$effect(() => {
		if (tourDone() || backup) return;
		const t = setTimeout(() => (tourOpen = true), autoTourDelay);
		return () => clearTimeout(t);
	});
</script>

<div class="studio" inert={tourOpen}>
	<header class="bar" data-chrome>
		<span class="pill">
			<button class="ghost" aria-label="Kembali" onclick={back}>
				<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"
					><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /></svg
				>
			</button>
			<span class="brand"><Brand /></span>
		</span>
		<span class="pill title">
			<span class="k">Karya</span>
			<span class="name">{project.name}</span>
			<span class="status" role="status" aria-live="polite"><span class="dot {saveState}"></span>{LABEL[saveState]}</span>
		</span>
		<button class="btn btn-primary save" data-tour="save" disabled={!meta || backup} onclick={() => (saveOpen = true)}>
			<span class="long">Simpan & bagikan</span><span class="short">Simpan</span>
		</button>
		<span class="pill">
			<nav class="nav" aria-label="Navigasi utama">
				<a href="/world">Canvas World</a>
				<a href="/works">Karyaku</a>
			</nav>
			<ProfileMenu {beforeLeave} onhelp={() => (helpOpen = true)} ontour={() => (tourOpen = true)} />
		</span>
	</header>

	{#if banner}
		<div class="banner-wrap">
			<div class="banner" role="alert">
				<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"
					><circle cx="12" cy="12" r="10" fill="none" stroke="var(--danger)" stroke-width="2" /><path
						d="M12 7v6M12 16.5v.5"
						stroke="var(--danger)"
						stroke-width="2.5"
						stroke-linecap="round"
					/></svg
				>
				<p>{banner}</p>
				{#if saveState === 'error'}<button class="btn btn-secondary" onclick={() => flush()}>Coba lagi</button>{/if}
				<button class="btn btn-text" onclick={() => (banner = null)}>Tutup</button>
			</div>
		</div>
	{/if}

	<main class="work" data-tour="board">
		<BoardCanvas bind:this={board} {project} {version} {tool} {slot} {showGrid} bind:zoom insetTop={toolbarH} {onstroke} />
		<div class="toolbar" bind:clientHeight={toolbarH} data-chrome>
			<div class="group" data-tour="history">
				<button class="btn btn-secondary" disabled={!hist.u} onclick={undo} aria-label="Urungkan">
					<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
						><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg
					><span class="lbl">Urungkan</span>
				</button>
				<button class="btn btn-secondary" disabled={!hist.r} onclick={redo} aria-label="Ulangi">
					<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
						><path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg
					><span class="lbl">Ulangi</span>
				</button>
			</div>
			{#if templates.length}
				<div class="group">
					<button class="btn btn-secondary" aria-label="Referensi pola" onclick={openTemplates}>
						<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
							><path
								d="M12 3l2.2 5.3L20 10l-5.8 1.7L12 17l-2.2-5.3L4 10l5.8-1.7z"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linejoin="round"
							/></svg
						><span class="lbl">Referensi</span>
					</button>
				</div>
			{/if}
			<div class="group" data-tour="view">
				<button class="btn btn-secondary" aria-pressed={showGrid} onclick={() => (showGrid = !showGrid)}>
					<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
						><path d="M4 4h16v16H4zM4 12h16M12 4v16" fill="none" stroke="currentColor" stroke-width="2" /></svg
					><span class="lbl">Grid</span>
				</button>
				<button class="btn btn-secondary" aria-pressed={tool === 'pan'} onclick={() => (tool = tool === 'pan' ? 'pencil' : 'pan')}>
					<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
						><path
							d="M8 12V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-3 7-6.5 7S5 17 4.5 14.5L3.8 12a1.5 1.5 0 012.8-1L8 13"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linejoin="round"
						/></svg
					><span class="lbl">Geser</span>
				</button>
				<div class="zoom">
					<button class="btn btn-secondary btn-icon" aria-label="Perkecil" onclick={() => board?.zoomBy(1 / 1.2)}>−</button>
					<span class="pct num" aria-live="polite">{Math.round(zoom * 100)}%</span>
					<button class="btn btn-secondary btn-icon" aria-label="Perbesar" onclick={() => board?.zoomBy(1.2)}>+</button>
					<button class="btn btn-secondary" onclick={() => board?.fit()}>Fit</button>
				</div>
			</div>
		</div>
	</main>

	<div class="shelf" data-chrome>
		<div class="rack" role="toolbar" aria-label="Palet blok magnet" data-tour="shelf">
			{#each project.palette as c, i (c.id)}
				<button
					class="swatch"
					class:on={tool === 'pencil' && slot === i}
					aria-pressed={tool === 'pencil' && slot === i}
					aria-label="{c.name ?? c.hex}, warna {i + 1}"
					title={c.name ?? c.hex}
					onclick={() => {
						slot = i;
						tool = 'pencil';
					}}
				>
					<span class="block" style:background={c.hex}></span>
					<span class="n num">{i + 1}</span>
				</button>
			{/each}
			<button class="swatch erase" class:on={tool === 'eraser'} aria-pressed={tool === 'eraser'} onclick={() => (tool = 'eraser')}>
				<span class="block">
					<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"
						><path d="M4 16l8-8 6 6-6 6H8zM12 20h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg
					>
				</span>
				<span class="n">Hapus</span>
			</button>
		</div>
		<p class="hint">
			<strong aria-live="polite">{activeName}</strong>
			<span class="mouse">Pilih warna, lalu klik atau tarik di papan.</span>
			<span class="touch">Ketuk untuk memasang · Dua jari untuk geser dan zoom</span>
		</p>
	</div>
</div>

<SaveDialog bind:open={saveOpen} {meta} name={project.name} guest={!auth.user} onsubmit={submitSave} onaccount={goAccount} />
<TemplatePicker bind:open={tplOpen} {templates} boardEmpty={tplBoardEmpty} onpick={stamp} />
{#if meta}<ShareDialog bind:open={shareOpen} {project} {meta} />{/if}
<HelpDialog bind:open={helpOpen} />
<Tour bind:open={tourOpen} />

<Modal bind:open={conflictOpen} closable={false} label="Karya berubah di tempat lain">
	<div class="dlg-body">
		<h2>Karya berubah di tempat lain</h2>
		<p>Draf di perangkat ini tetap aman. Pilih versi terbaru dari cloud, atau simpan perubahanmu sebagai karya baru.</p>
		{#if conflictError}<p class="err" role="alert">{conflictError}</p>{/if}
		<div class="dlg-actions">
			<button class="btn btn-secondary" onclick={loadLatest}>Muat versi terbaru</button>
			<button class="btn btn-primary" onclick={saveAsNew}>Simpan sebagai baru</button>
		</div>
	</div>
</Modal>

<style>
	.studio {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		background: var(--section-green);
		overflow: hidden;
	}
	/* Header memakai pil melayang, senada dengan navbar halaman lain. */
	.bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px max(12px, env(safe-area-inset-left));
		min-width: 0;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		padding: 4px 14px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: 999px;
		box-shadow: 0 6px 16px rgb(21 61 43 / 0.12);
	}
	.ghost {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--ink);
		cursor: pointer;
	}
	.ghost:hover {
		background: var(--highlight);
	}
	.bar :global(.trigger) {
		border: 0;
		min-height: 40px;
		padding-right: 4px;
	}
	.title {
		flex: 0 1 auto;
		margin: 0 auto;
		max-width: 460px;
		gap: 10px;
		overflow: hidden;
	}
	.name {
		font-weight: 600;
		font-size: var(--text-md);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}
	.k {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
		flex: none;
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding-left: 10px;
		border-left: 1px solid var(--line);
		font-size: var(--text-sm);
		font-weight: 500;
		white-space: nowrap;
		flex: none;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex: none;
	}
	.dot.local {
		border: 2px solid var(--outline);
		background: var(--bg);
	}
	.dot.saving {
		border: 2px solid var(--outline);
		background: var(--highlight);
	}
	.dot.saved {
		background: var(--primary);
	}
	.dot.error,
	.dot.conflict {
		background: var(--danger);
	}
	.status:has(.error),
	.status:has(.conflict) {
		color: var(--danger);
	}
	.nav {
		display: flex;
		gap: 2px;
	}
	.nav a {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 12px;
		border-radius: 999px;
		color: var(--ink);
		text-decoration: none;
		font-weight: 500;
	}
	.nav a:hover {
		background: var(--highlight);
	}
	.short {
		display: none;
	}
	.banner-wrap {
		padding: 12px max(16px, env(safe-area-inset-left)) 0;
	}
	.work {
		position: relative;
		flex: 1;
		min-height: 0;
	}
	.toolbar {
		position: absolute;
		inset: 0 0 auto;
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding: 12px 16px;
		pointer-events: none;
		flex-wrap: wrap;
	}
	.group {
		display: flex;
		gap: 2px;
		align-items: center;
		pointer-events: auto;
		padding: 4px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: 999px;
		box-shadow: 0 6px 16px rgb(21 61 43 / 0.12);
	}
	.zoom {
		display: flex;
		gap: 2px;
		align-items: center;
	}
	.group .btn {
		min-height: 40px;
		border: 0;
		background: none;
		border-radius: 999px;
		box-shadow: none;
	}
	.group .btn:hover:not(:disabled) {
		background: var(--highlight);
	}
	.group .btn[aria-pressed='true'] {
		background: var(--section-green);
		box-shadow: inset 0 0 0 1.5px var(--outline);
	}
	.group .btn-icon {
		width: 40px;
	}
	.pct {
		min-width: 48px;
		text-align: center;
		font-weight: 600;
		font-size: var(--text-sm);
		line-height: 40px;
	}
	.toolbar .btn-icon {
		font-size: 22px;
		font-weight: 600;
	}
	.shelf {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 4px 12px max(12px, env(safe-area-inset-bottom));
		min-width: 0;
	}
	/* Baki palet: datar ber-outline seperti pil lain; blok di dalamnya tetap timbul. */
	.rack {
		display: flex;
		gap: 6px;
		max-width: 100%;
		overflow-x: auto;
		padding: 10px 12px;
		background: var(--bg);
		border: var(--outline-thin);
		border-radius: var(--radius-md);
		box-shadow: 0 8px 18px rgb(21 61 43 / 0.14);
		scrollbar-width: thin;
	}
	.swatch {
		flex: none;
		display: grid;
		justify-items: center;
		gap: 2px;
		width: 52px;
		padding: 4px;
		background: none;
		border: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--muted);
	}
	.swatch:hover {
		background: var(--highlight);
	}
	.block {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-xs);
		box-shadow:
			inset 0 3px 0 rgb(255 255 255 / 0.28),
			inset 0 -4px 0 rgb(0 0 0 / 0.22),
			0 2px 0 rgb(0 0 0 / 0.3);
		transition: transform 0.15s ease-out;
	}
	.n {
		font-size: var(--text-xs);
		font-weight: 600;
		line-height: 14px;
	}
	.swatch.on {
		color: var(--ink);
	}
	.swatch.on .block {
		transform: translateY(-8px);
		outline: var(--outline-strong);
		box-shadow:
			0 0 0 3px var(--bg),
			var(--shadow-control);
	}
	.swatch.on .n {
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 3px;
		font-weight: 700;
	}
	.erase .block {
		background: var(--bg);
		color: var(--ink);
		box-shadow:
			inset 0 0 0 1.5px var(--outline),
			0 2px 0 rgb(21 61 43 / 0.2);
	}
	.erase {
		width: 60px;
	}
	.hint {
		display: flex;
		gap: 8px;
		align-items: baseline;
		font-size: var(--text-sm);
		color: var(--muted);
	}
	.hint strong {
		color: var(--ink);
	}
	.touch {
		display: none;
	}
	@media (pointer: coarse) {
		.mouse {
			display: none;
		}
		.touch {
			display: inline;
		}
	}
	.err {
		color: var(--danger);
		font-weight: 500;
	}
	.save {
		box-shadow: 0 6px 16px rgb(21 61 43 / 0.18);
	}
	@media (max-width: 800px) {
		.nav,
		.lbl {
			display: none;
		}
		.toolbar .btn:not(.btn-icon) {
			padding: 0 12px;
		}
	}
	@media (max-width: 600px) {
		.bar {
			gap: 8px;
			padding: 8px;
		}
		.brand {
			display: none;
		}
		.title {
			padding: 4px 10px;
		}
		.k {
			display: none;
		}
		.long {
			display: none;
		}
		.short {
			display: inline;
		}
		.save {
			padding: 0 12px;
		}
		.swatch {
			width: 52px;
			min-height: 64px;
		}
		.toolbar {
			padding: 8px;
		}
	}
	@media (max-width: 400px) {
		.pct {
			display: none;
		}
		.bar {
			flex-wrap: wrap;
			row-gap: 4px;
		}
		.title {
			order: 5;
			flex-basis: 100%;
		}
		.save {
			margin-left: auto;
		}
	}
</style>
