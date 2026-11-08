# Snap & Smile — paket pembaruan pengaturan Admin

## Fitur pengaturan baru
- Admin dapat mengatur maksimal jepretan dalam satu photo strip (1–12).
- Admin dapat mengatur maksimal unggahan photo strip per perangkat per event (1–50).
- Kedua batas disimpan per event melalui konfigurasi KV dan diberlakukan di Worker/Durable Object, bukan hanya teks tampilan.
- Pilihan jumlah foto pada kamera mengikuti batas jepretan yang dipilih Admin.
- Kuota sisa, keterangan tamu, dan validasi upload mengikuti batas unggahan event.
- Pengambilan foto tetap manual satu per satu; kamera dapat diganti antarjepretan.
- Saat tab/halaman disembunyikan atau tamu keluar/ganti nama, flash dimatikan tanpa memanggil stop pada media stream. Tombol Stop Kamera tetap menghentikan kamera secara sengaja.
- Animasi printer memakai foto asli dalam kertas berbentuk strip, tanpa sisi putih lebar di kiri dan kanan.

## Deploy
1. Backup repository dan data.
2. Ganti file project dengan isi paket ini, termasuk folder `frames`, `wrangler.toml`, dan `.assetsignore`.
3. Pastikan `wrangler.toml` tetap menyertakan binding KV `SNAP_SMILE_SETTINGS` dan Durable Object `SNAP_STATE` / class `SnapSmileState`. Jangan menghapus namespace/Secrets yang sudah ada.
4. Commit dan deploy melalui Cloudflare Workers Builds.
5. Buka Admin, pilih event, atur kedua batas, lalu tekan Simpan Pengaturan.
6. Uji: set maksimal jepretan 6 dan unggahan 2, masuk ke halaman event, pastikan kamera menampilkan 1–6 foto dan kuota tamu menunjukkan 2. Setelah pengujian, kembalikan batas sesuai kebutuhan.

## Kompatibilitas data kuota lama
Jumlah unggahan yang sudah tersimpan pada Durable Object tetap dipertahankan. Jika batas baru lebih kecil dari jumlah yang sudah dipakai, sisa kuota menjadi 0; menaikkan batas akan membuka sisa kuota sesuai selisihnya.

## Catatan
Pemeriksaan statis tidak menggantikan uji nyata pada browser, kamera, Cloudflare, dan ImageKit. Pengaturan batas hanya membatasi aplikasi; tetap pantau kuota penyimpanan/bandwidth ImageKit dan nonaktifkan opsi berbayar otomatis pada akun.
