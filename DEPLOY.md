# Deploy MIVUBI Canvas Pixel di VPS

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
tidak membaca berkas itu, dan service ini berjalan sebagai user `mivubi` yang tidak punya nvm sama
sekali — jadi `ExecStart=/usr/bin/node` gagal dengan "No such file or directory" kalau Node hanya
ada di nvm.

Kalau tetap ingin memakai nvm untuk service, buat tautan tetap dan tunjuk itu di unit file:

```bash
sudo ln -sfn "$(nvm which 22)" /usr/local/bin/node-mivubi
node-mivubi -v
# lalu di unit file: ExecStart=/usr/local/bin/node-mivubi build/index.js
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

```bash
sudo adduser --system --group --home /srv/mivubi mivubi
sudo -u mivubi -H bash
cd /srv/mivubi
git clone <repo> app && cd app
npm ci
```

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

`/etc/systemd/system/mivubi.service`:

```ini
[Unit]
Description=MIVUBI Canvas Pixel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mivubi
Group=mivubi
WorkingDirectory=/srv/mivubi/app
EnvironmentFile=/srv/mivubi/app/.env
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
# Wajib: adapter-node memakai ORIGIN untuk memeriksa asal permintaan.
Environment=ORIGIN=https://mivubi.example.com
# Default adapter-node 512K, sedangkan desain poster boleh sampai 1 MB.
Environment=BODY_SIZE_LIMIT=2M
# Pakai jalur absolut. Kalau Node dari nvm, tunjuk tautan /usr/local/bin/node-mivubi (§1.2).
ExecStart=/usr/bin/node build/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/mivubi/app

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mivubi
sudo systemctl status mivubi
journalctl -u mivubi -f
```

`EnvironmentFile` membaca `.env` apa adanya: baris `KUNCI=nilai`, komentar `#` boleh, tanda kutip
diperlakukan sebagai bagian dari nilai — jadi jangan mengutip nilai apa pun di sana.

## 7. Reverse proxy

Caddy (`/etc/caddy/Caddyfile`):

```
mivubi.example.com {
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
	server_name mivubi.example.com;
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
sudo nano /etc/nginx/sites-available/mivubi          # isi blok server di atas
sudo ln -s /etc/nginx/sites-available/mivubi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default          # kalau halaman bawaan tidak dipakai
sudo nginx -t                                        # uji sintaks sebelum reload
sudo systemctl reload nginx
sudo certbot --nginx -d mivubi.example.com           # sertifikat + redirect 80 ke 443
```

Caddy mengurus sertifikatnya sendiri, cukup `sudo systemctl reload caddy`.

## 8. Memperbarui versi

```bash
cd /srv/mivubi/app
git pull
npm ci
npm run db:migrate
npm run build
sudo systemctl restart mivubi
```

Migrasi dijalankan sebelum build supaya skema sudah siap saat proses baru menerima permintaan.

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
