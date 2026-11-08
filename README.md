# Snap & Smile — paket lengkap perbaikan

Paket ini mempertahankan struktur aplikasi Snap & Smile yang sudah ada dan menyertakan seluruh aset frame. Gunakan paket sebagai satu kesatuan; jangan hanya mengunggah `index.html` jika ingin memastikan frame lokal ikut tersedia.

## Isi paket

- `index.html` — halaman photobooth, kamera, timer, photo strip, dan galeri.
- `admin.html` — panel admin.
- `worker.js` — Cloudflare Worker API.
- `wrangler.toml` — konfigurasi Worker dan binding aset/KV proyek.
- `frames/` — 8 frame JPG: floral cream, pink, maroon, sage, mocha, champagne, Minang cream, dan Minang maroon.

## Cara memasang di GitHub

1. Ekstrak ZIP ini.
2. Buka repository GitHub yang saat ini dipakai untuk Snap & Smile.
3. Unggah/ganti file dan folder dari isi ZIP ke **root repository**. Pastikan `index.html`, `admin.html`, `worker.js`, `wrangler.toml`, dan folder `frames/` berada sejajar di root; jangan meletakkan semuanya di dalam satu subfolder tambahan.
4. Pastikan folder `frames/` tetap bernama `frames` dan berisi 8 file JPG. Jangan mengganti nama file frame.
5. Commit perubahan, lalu tunggu Cloudflare Build/Deployment berstatus **Ready/Success**.
6. Buka situs dengan refresh penuh atau tab privat untuk menghindari cache versi lama.

## Pengaturan Cloudflare yang wajib dipertahankan

Paket ini tidak meminta penghapusan atau pembuatan ulang penyimpanan. Pertahankan binding, namespace, Durable Object, variables, dan secrets yang sudah digunakan oleh proyek. Khususnya jangan menghapus:

- `ASSETS`
- `SNAP_SMILE_SETTINGS`
- `SNAP_STATE`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_URL_ENDPOINT`
- `ADMIN_PASSWORD`
- `ADMIN_SECRET`

Jika nama binding/secret pada dashboard berbeda dari daftar tersebut, jangan mengubahnya secara coba-coba. Cocokkan dengan konfigurasi Worker yang sudah aktif sebelum deploy.

## Catatan penting

- Jangan menghapus KV namespace atau Durable Object karena dapat menghilangkan akses ke konfigurasi acara/galeri yang sudah tersimpan.
- Frame JPG harus tetap ada di folder `frames/`; file HTML saja bukan pengganti aset-aset tersebut.
- Login admin tetap perlu diuji pada domain Worker sebenarnya karena bergantung pada password, secret, cookie HTTPS, dan binding Cloudflare.
- Setelah deploy, uji: login admin, tampilan kamera di ponsel, timer 3/5/dimatikan, ambil foto, frame, simpan/unggah galeri, dan tombol unduh.


## Pemulihan konfigurasi Cloudflare (penting)

`wrangler.toml` pada paket pemulihan ini sudah mencantumkan binding Durable Object `SNAP_STATE` dengan kelas `SnapSmileState` dan format `exports` (tanpa blok `migrations`). Ini dimaksudkan untuk memakai namespace SQLite yang sudah diprovisikan sebelumnya. Jangan menghapus atau membuat ulang Durable Object maupun KV.

### Deploy yang benar

1. Pastikan repository GitHub yang terhubung ke Cloudflare berisi file `worker.js`, `index.html`, `admin.html`, `wrangler.toml`, dan folder `frames/` langsung di root repository.
2. Di Cloudflare Workers & Pages, buka aplikasi `snap-smile` dan pastikan deployment menggunakan **Worker dengan Build/Deploy command `npx wrangler deploy`**, bukan upload **static assets only**. Jika halaman Settings menampilkan pesan bahwa Variables/Bindings tidak tersedia untuk static assets only, berarti deployment masih berupa static-only.
3. Hubungkan/atur kembali deployment ke repository Git yang memuat `wrangler.toml`, lalu deploy. Jangan membuat Worker baru dengan nama lain dan jangan menghapus resource lama.
4. Setelah Worker aktif, buka Settings → Variables and Secrets. Tambahkan nilai berikut (gunakan nilai milik proyek sendiri; jangan menaruh nilai rahasia di file ini atau GitHub):
   - **Secrets**: `ADMIN_PASSWORD`, `ADMIN_SECRET`, `IMAGEKIT_PRIVATE_KEY`.
   - **Text variables**: `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT`.
   - Binding KV: `SNAP_SMILE_SETTINGS` harus menunjuk ke namespace ID `da49c5e961d14fc38ef79ca634b7ec93`.
   - Binding Durable Object: `SNAP_STATE` → class `SnapSmileState` (SQLite).
5. Jika secret lama masih ada di Worker yang sama, jangan ubah nilainya. Jika sudah hilang, buat nilai baru sendiri: password admin baru untuk `ADMIN_PASSWORD`, dan string acak panjang (minimal 32 karakter) untuk `ADMIN_SECRET`. Untuk ImageKit, masukkan kembali kredensial dari dashboard akun ImageKit yang sama.
6. Deploy ulang setelah menambah binding/variables/secrets.
7. Buka `https://DOMAIN-ANDA/api/diag`. Semua nilai `kv`, `assets`, `state`, `imagekitPrivateKey`, `imagekitPublicKey`, `imagekitUrlEndpoint`, `adminPassword`, dan `adminSecret` harus bernilai `true`. Endpoint ini hanya menampilkan status ada/tidaknya nilai, bukan rahasianya.

### Cara menambahkan variable/secret lewat dashboard

Di Cloudflare: Workers & Pages → `snap-smile` → Settings → Variables and Secrets → Add. Pilih **Secret** untuk `ADMIN_PASSWORD`, `ADMIN_SECRET`, dan `IMAGEKIT_PRIVATE_KEY`; pilih **Text** untuk `IMAGEKIT_PUBLIC_KEY` dan `IMAGEKIT_URL_ENDPOINT`. Isi nama persis seperti di atas, masukkan nilainya, lalu Save. Setelah itu Deploy ulang. Tampilan dashboard bisa sedikit berbeda di ponsel; jika menu ini masih menampilkan “Variables cannot be added ... only has static assets”, jangan lanjut menambahkan apa pun—perbaiki jenis deployment terlebih dahulu.

`ADMIN_PASSWORD` adalah password yang diketik di halaman admin. `ADMIN_SECRET` bukan password login; ini kunci internal untuk menandatangani cookie admin. Jangan gunakan password yang sama untuk keduanya.
