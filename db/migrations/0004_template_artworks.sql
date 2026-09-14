-- Referensi dipajang di Canvas World sebagai karya milik akun sistem MIVUBI.
-- Akun ini tidak bisa dipakai masuk: hash-nya bukan format scrypt.
insert into users (id, username, pass_hash)
values ('00000000-0000-4000-8000-000000000001', 'MIVUBI', '!')
on conflict do nothing;

alter table templates add column if not exists project_id uuid references projects (id) on delete set null;
