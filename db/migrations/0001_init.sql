-- Skema awal MIVUBI Canvas Pixel (PRD §11, §13).
-- Satu transaksi per berkas; dijalankan berurutan oleh scripts/migrate.js.

create extension if not exists btree_gist;

-- Pengaturan pameran: satu baris.
create table if not exists settings (
	id                 smallint primary key default 1 check (id = 1),
	canvas_width_mm    integer not null default 2400,
	canvas_height_mm   integer not null default 1200,
	canvas_cell_mm     integer not null default 50,
	gap                integer not null default 4 check (gap between 0 and 256),
	palette            jsonb   not null,
	updated_at         timestamptz not null default now()
);

create table if not exists users (
	id         uuid primary key default gen_random_uuid(),
	username   text not null,
	pass_hash  text not null,
	created_at timestamptz not null default now()
);
create unique index if not exists users_username_key on users (lower(username));

-- Perangkat tamu: karya tanpa akun tetap punya pemilik (PRD FR-DEV).
create table if not exists devices (
	id           uuid primary key default gen_random_uuid(),
	secret_hash  text not null,
	display_name text not null default '',
	claimed_by   uuid references users (id) on delete set null,
	created_at   timestamptz not null default now(),
	last_seen_at timestamptz not null default now()
);

create table if not exists projects (
	id              uuid primary key,
	owner_user_id   uuid references users (id) on delete set null,
	owner_device_id uuid references devices (id) on delete set null,
	doc             jsonb not null,             -- Project tanpa cells
	cells           bytea not null,             -- Uint16Array little-endian, 2 byte per sel
	revision        integer not null default 0,
	visibility      text not null default 'private' check (visibility in ('private', 'public')),
	saved_at        timestamptz,
	title           text,
	creator_name    text,
	social_handle   text,
	taken_down_at   timestamptz,
	takedown_reason text,
	deleted_at      timestamptz,
	purge_after     timestamptz,
	created_at      timestamptz not null default now(),
	updated_at      timestamptz not null default now(),
	constraint projects_owner_present check (owner_user_id is not null or owner_device_id is not null)
);
create index if not exists projects_owner_user_idx   on projects (owner_user_id, updated_at desc);
create index if not exists projects_owner_device_idx on projects (owner_device_id, updated_at desc);
-- Daftar karya publik Canvas World, urut (saved_at, id) desc sesuai kursor §13.5.
create index if not exists projects_public_idx on projects (saved_at desc, id desc)
	where visibility = 'public' and taken_down_at is null and deleted_at is null;
create index if not exists projects_purge_idx on projects (purge_after) where purge_after is not null;

-- Penempatan karya di Canvas World. Dua karya tidak boleh tumpang tindih:
-- dijamin exclusion constraint, bukan pengecekan di aplikasi (PRD §13.4).
create table if not exists placements (
	project_id uuid primary key references projects (id) on delete cascade,
	x    integer not null,
	y    integer not null,
	w    integer not null check (w > 0),
	h    integer not null check (h > 0),
	gap  integer not null default 0,
	xr   int4range generated always as (int4range(x, x + w)) stored,
	yr   int4range generated always as (int4range(y, y + h)) stored,
	placed_at timestamptz not null default now(),
	exclude using gist (xr with &&, yr with &&)
);

-- Referensi pola yang bisa ditempel di Studio.
create table if not exists templates (
	id         uuid primary key default gen_random_uuid(),
	name       text not null,
	colors     jsonb not null,
	rows       jsonb not null,
	position   integer not null default 0,
	updated_at timestamptz not null default now()
);

-- Katalog template poster: preset digambar kode, image memakai berkas di R2.
create table if not exists poster_templates (
	id         uuid primary key default gen_random_uuid(),
	name       text not null,
	kind       text not null default 'image' check (kind in ('preset', 'image')),
	preset_id  text,
	asset_key  text,
	area       jsonb,
	position   integer not null default 0,
	updated_at timestamptz not null default now()
);
