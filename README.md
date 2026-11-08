# Snap & Smile — paket uji pembaruan

## Isi
index.html, admin.html, worker.js, wrangler.toml, folder frames (8 JPG).

## Pembaruan
- Pengambilan foto manual satu per satu (1–4 foto per strip).
- Ganti kamera di antara jepretan; foto yang sudah diambil tetap tersimpan.
- Flash/torch dimatikan dan stream dihentikan ketika keluar dari halaman atau browser disembunyikan.
- Printer memperlihatkan photo strip asli yang diunggah.
- Teks tombol masuk putih; teks nama tamu hitam.
- Maksimal 4 unggahan photo strip per perangkat per event (sebelumnya 3).
- Galeri tidak lagi memotong daftar pada 500 hasil.
- Tombol ekspor QR event bergambar PNG di Admin, memuat nama event. Memerlukan akses server QR eksternal; jika diblokir, gunakan tautan QR biasa.

## Deploy
1. Simpan backup project dan data sebelum mengganti file.
2. Ganti file di root project sesuai isi ZIP, termasuk folder frames.
3. Pastikan binding KV, Durable Object, dan Secrets yang sudah ada tidak dihapus atau diganti. Periksa wrangler.toml terhadap konfigurasi deployment aktif sebelum overwrite.
4. Deploy melalui alur Cloudflare/GitHub yang biasa digunakan.
5. Uji di HP: masuk sebagai tamu, jepret 4 kali manual, pindah kamera, aktifkan flash lalu keluar, upload, cek printer/galeri, ekspor QR dari Admin.

## Catatan penting
Pemeriksaan kode lokal bukan pengujian kamera fisik, koneksi ImageKit, login admin, atau deployment Cloudflare. Fitur QR PNG bergantung pada layanan QR eksternal dan kebijakan CORS browser. Pembatasan kuota gratis ImageKit tidak bisa dijamin dari kode ini: pantau dashboard layanan dan nonaktifkan penagihan/upgrade berbayar di akun. Galeri besar memerlukan pengujian performa tambahan.
