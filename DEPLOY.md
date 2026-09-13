# Deploy Block Unblock di VPS

Aplikasi dibangun dengan `@sveltejs/adapter-node`: `npm run build` menghasilkan server Node di
`build/index.js`. Database di Neon, berkas desain poster di Cloudflare R2. Tidak ada Docker,
tidak ada proses tambahan — satu service systemd di belakang reverse proxy.

## 1. Prasyarat di VPS

Perintah di bawah untuk Ubuntu/Debian. Yang dibutuhkan: Node.js 22+, reverse proxy, domain yang
sudah mengarah ke IP VPS, dan akses keluar ke Neon serta R2 (keduanya lewat HTTPS/TCP, tidak perlu
IP statis).

### 1.1 Node.js

Untuk **service** pakai Node sistem lewat NodeSource, bukan nvm. Alasannya ada di §1.2.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v          # v22.x
which node                 # /usr/bin/node
```

### 1.2 nvm (opsional, untuk sesi kerjamu sendiri)

```bash
# Cek tag terbaru di github.com/nvm-sh/nvm, lalu:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc           # atau ~/.zshrc; atau logout lalu masuk lagi
nvm install 22
nvm alias default 22
node -v
```

**Jebakan nvm + systemd.** nvm memasang Node di dalam home pengguna
(`~/.nvm/versions/node/v22.x/bin/node`) dan hanya aktif setelah shell membaca `~/.bashrc`. systemd
tidak membaca berkas itu — jadi `ExecStart=/usr/bin/node` gagal dengan "No such file or directory"
kalau Node hanya ada di nvm, apalagi kalau service dijalankan sebagai user lain yang tidak punya
nvm sama sekali.

Kalau tetap ingin memakai nvm untuk service, buat tautan tetap dan tunjuk itu di unit file:

```bash
sudo ln -sfn "$(nvm which 22)" /usr/local/bin/node-blockunblock
node-blockunblock -v
# lalu di unit file: ExecStart=/usr/local/bin/node-blockunblock build/index.js
```

Tautan itu perlu diperbarui setiap kali kamu `nvm install` versi baru. Itulah kenapa Node sistem
lebih tenang untuk server, dan nvm dibiarkan untuk sesi interaktif.

### 1.3 nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable --now nginx
sudo systemctl status nginx
```

Kalau ufw menyala:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'    # 80 dan 443
sudo ufw enable
```

Buka `http://<ip-vps>` untuk memastikan halaman bawaan nginx muncul. Konfigurasi situsnya di §7,
sertifikatnya lewat certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Caddy bisa menggantikan nginx dan mengurus TLS sendiri (`sudo apt install -y caddy`); contoh
Caddyfile juga ada di §7.

## 2. Ambil kode dan pasang dependensi

Pakai user login yang sudah ada. Tidak perlu membuat user baru: kode di home-mu sendiri, `npm ci`
dan `npm run build` jalan tanpa `sudo`, dan kepemilikan berkas tidak pernah bentrok.

```bash
mkdir -p ~/apps && cd ~/apps
git clone <repo> blockunblock && cd blockunblock
npm ci
```

Contoh selanjutnya memakai `/home/<user>/apps/blockunblock`. Kalau kamu masuk sebagai root,
jalurnya `/root/apps/blockunblock` — home root bukan `/home/root`.

## 3. Isi environment

Salin `.env.example` menjadi `.env`, lalu isi 11 variabelnya:

```bash
cp .env.example .env
chmod 600 .env
```

- `DATABASE_URL` — connection string Neon (produksi). Hapus `DATABASE_URL_DEV` di server;
  variabel itu hanya untuk mesin pengembang dan **menang** kalau ada.
- `DEVICE_TOKEN_PEPPER`, `USER_SESSION_SECRET`, `ADMIN_SESSION_SECRET` — masing-masing acak,
  minimal 32 karakter: `openssl rand -base64 32`.
- `ADMIN_PASSWORD_HASH` — hasil `npm run admin:hash-password "password-admin"`.
- `R2_*` — endpoint, bucket, dan kunci akses R2.

## 4. Siapkan database

```bash
npm run db:migrate
```

Menjalankan `db/migrations/*.sql` berurutan, satu transaksi per berkas, dan mencatatnya di tabel
`schema_migrations`. Aman dijalankan ulang: berkas yang sudah diterapkan dilewati.

## 5. Build

```bash
npm run build
```

## 6. Service systemd

`/etc/systemd/system/blockunblock.service`:

```ini
[Unit]
Description=Block Unblock
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
# Sesuaikan tiga baris berikut dengan user dan jalur sebenarnya (lihat catatan di bawah).
User=bariq
Group=bariq
WorkingDirectory=/home/bariq/apps/blockunblock
EnvironmentFile=/home/bariq/apps/blockunblock/.env
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
# Wajib: adapter-node memakai ORIGIN untuk memeriksa asal permintaan.
Environment=ORIGIN=https://blockunblock.example.com
# Default adapter-node 512K, sedangkan desain poster boleh sampai 1 MB.
Environment=BODY_SIZE_LIMIT=2M
# Pakai jalur absolut. Kalau Node dari nvm, tunjuk tautan /usr/local/bin/node-blockunblock (§1.2).
ExecStart=/usr/bin/node build/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
# Jangan ProtectHome=true: itu menyembunyikan /home dari service, dan ExecStart gagal
# "No such file or directory" padahal berkasnya jelas ada.
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

Jangan memakai placeholder apa pun di unit file. Tanda `%` adalah awalan spesifier systemd
(`%u` nama user, `%U` UID), jadi tulisan seperti `%USER%` tidak akan diganti — ia ditafsirkan
sebagai spesifier dan menghasilkan jalur yang salah tanpa pesan yang jelas.

Isi dengan hasil `whoami` dan `pwd` apa adanya. Perhatikan home root berbeda:

```ini
# root
User=root
Group=root
WorkingDirectory=/root/apps/blockunblock
EnvironmentFile=/root/apps/blockunblock/.env
```

Lalu:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now blockunblock
sudo systemctl status blockunblock
journalctl -u blockunblock -f
```

`ProtectHome=read-only` aman di sini karena aplikasi tidak pernah menulis ke disk saat berjalan:
unggahan masuk ke R2, data ke Postgres.

`EnvironmentFile` membaca `.env` baris per baris: `KUNCI=nilai`, komentar `#` diabaikan, tanda
kutip tunggal atau ganda di sekitar nilai dilepas, dan tidak ada ekspansi variabel. Berkasnya harus
ada — kalau tidak, service gagal start dengan `Failed to load environment files`, bukan berjalan
tanpa env.

### 6.1 Pilihan lain

**Service milik user**, kalau tidak mau menyentuh systemd sistem sama sekali:

```bash
mkdir -p ~/.config/systemd/user
# simpan unit yang sama di ~/.config/systemd/user/blockunblock.service, tanpa baris User=/Group=
systemctl --user daemon-reload
systemctl --user enable --now blockunblock
sudo loginctl enable-linger $USER    # tanpa ini service berhenti saat kamu logout
journalctl --user -u blockunblock -f
```

**User khusus**, kalau VPS-nya dipakai bersama atau home-mu menyimpan kunci penting. Proses
aplikasi bisa membaca seluruh isi home user yang menjalankannya — termasuk `~/.ssh` dan kredensial
proyek lain — dan user khusus memutus akses itu:

```bash
sudo adduser --system --group --home /srv/blockunblock blockunblock
sudo -u blockunblock -H bash -c 'cd /srv/blockunblock && git clone <repo> app && cd app && npm ci && npm run build'
# di unit file: User/Group=blockunblock, WorkingDirectory=/srv/blockunblock/app,
#               ProtectHome=true, ReadWritePaths=/srv/blockunblock/app
```

**Jangan jalankan sebagai root.** Proses yang dijebol sebagai user biasa hanya menjangkau berkas
user itu; sebagai root ia menjangkau seluruh mesin, termasuk `/etc` dan cron.

## 7. Reverse proxy

Caddy (`/etc/caddy/Caddyfile`):

```
blockunblock.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
	request_body {
		max_size 2MB
	}
}
```

nginx:

```nginx
server {
	server_name blockunblock.example.com;
	client_max_body_size 2m;

	location / {
		proxy_pass http://127.0.0.1:3000;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
}
```

Pasang situsnya:

```bash
sudo nano /etc/nginx/sites-available/blockunblock          # isi blok server di atas
sudo ln -s /etc/nginx/sites-available/blockunblock /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default          # kalau halaman bawaan tidak dipakai
sudo nginx -t                                        # uji sintaks sebelum reload
sudo systemctl reload nginx
sudo certbot --nginx -d blockunblock.example.com           # sertifikat + redirect 80 ke 443
```

Caddy mengurus sertifikatnya sendiri, cukup `sudo systemctl reload caddy`.

## 8. Memperbarui versi

```bash
cd ~/apps/blockunblock
git pull
npm ci
npm run db:migrate
npm run build
sudo systemctl restart blockunblock
```

Migrasi dijalankan sebelum build supaya skema sudah siap saat proses baru menerima permintaan.

## Pemecahan masalah

| Gejala | Penyebab yang paling sering |
| --- | --- |
| `Failed to load environment files: No such file or directory` | Jalur `EnvironmentFile` salah, atau `.env` memang belum dibuat di server. Root ada di `/root`, bukan `/home/root`. |
| `Failed to run 'start' task: No such file or directory` | Jalur `ExecStart` atau `WorkingDirectory` salah, atau Node tidak ada di `/usr/bin/node` (§1.2). |
| Service start, tapi semua POST gagal | `ORIGIN` tidak sama dengan URL yang dibuka peramban. |
| Unggahan desain poster ditolak | `BODY_SIZE_LIMIT` atau `client_max_body_size` lebih kecil dari berkasnya. |
| `502 Bad Gateway` dari nginx | Service mati, atau `PORT`/`HOST` tidak cocok dengan `proxy_pass`. |

Perintah yang menjawab paling cepat:

```bash
systemctl cat blockunblock                  # unit file yang benar-benar dipakai systemd
systemctl show blockunblock -p ExecStart -p WorkingDirectory -p EnvironmentFiles
journalctl -u blockunblock -n 50 --no-pager
```

## Catatan operasional

- **Neon menidurkan compute.** Permintaan pertama setelah menganggur menunggu compute bangun.
  Lapisan database sudah mencoba ulang sekali untuk galat tingkat koneksi, jadi yang terasa hanya
  jeda, bukan galat.
- **Ukuran unggahan.** Desain poster dibatasi 1 MB di kode; `BODY_SIZE_LIMIT` dan
  `client_max_body_size` harus lebih longgar dari itu, kalau tidak permintaan ditolak sebelum
  sampai ke aplikasi.
- **Berkas R2** dilayani lewat `/api/assets/<key>` oleh aplikasi sendiri, jadi bucket tidak perlu
  dibuka ke publik dan tidak ada URL bertanda tangan yang bocor ke klien.
- **Rahasia.** `.env` mode 600 milik user service. Mengganti `ADMIN_SESSION_SECRET` atau
  `USER_SESSION_SECRET` otomatis mengeluarkan semua sesi yang sedang berjalan.
- **Cadangan.** Neon punya PITR bawaan; pastikan retensinya sesuai kebutuhan sebelum pameran.
