SNAP & SMILE — PAKET PEMBARUAN

Isi paket:
- index.html : tampilan kamera sentuh, pilihan jumlah foto/frame/filter, auto-start kamera setelah pengunjung masuk, kontrol kamera dan indikator upload bergaya printer.
- admin.html : file admin dasar dipertahankan tanpa perubahan.
- worker.js : worker dasar versi upload lebih cepat dipertahankan tanpa perubahan.

Catatan kompatibilitas:
- Kamera memerlukan HTTPS dan izin browser. Browser tetap menampilkan prompt izin pertama kali.
- Pilihan zoom/lensa dan flash mengikuti dukungan perangkat/browser. Tombol tidak dapat memaksa lensa ultra-wide bila browser tidak mengeksposnya.
- Animasi printer memakai progres unggah XMLHttpRequest; status sukses hanya ditampilkan setelah server memberi respons sukses.
- Seluruh pengaturan admin dan worker lama dipertahankan.

Sebelum deploy ke hosting, simpan salinan file aktif dan deploy ketiga file sesuai struktur hosting yang digunakan.
