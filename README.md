# Activity Tracker FE v2 (Simple & Mobile-Responsive)

Frontend baru yang lebih ringkas, cepat, dan ramah perangkat mobile untuk **Activity Tracker Management (ATM)**, terhubung langsung dengan backend `activity-tracker-be`.

## Keunggulan dibandingkan FE Lama
1. **Single-Page Expandable Cards**: Tidak perlu berpindah 3 halaman berbeda (`Project` -> `Detail Project` -> `Detail Task`) hanya untuk melihat atau menambah Activity. Pilih Project di bagian atas, klik kartu Task untuk expand, dan langsung tambahkan Activity di dalamnya.
2. **Input Cepat & Smart Defaults**:
   - Tanggal mulai & target otomatis terisi hari ini (bisa disesuaikan bila perlu).
   - Pilihan *Assignor* dan *Validator* terakhir otomatis diingat (`localStorage`) sehingga tidak perlu memilih ulang setiap kali input.
3. **One-Tap Status Toggle**: Klik ikon lingkaran/centang pada item Activity untuk langsung mengubah status `IN_PROGRESS` <-> `DONE` dan otomatis memperbarui persentase progress Task & Project.
4. **Mobile-First Responsive**: Menggunakan bottom-sheet modal, horizontal project selector, dan Floating Action Button (FAB) pada layar smartphone.

## Cara Menjalankan
1. Pastikan variabel environment `NEXT_PUBLIC_API_URL` di `.env.local` mengarah ke URL `activity-tracker-be` Anda (contoh: `http://localhost:4003`).
2. Jalankan server development:
   ```bash
   npm run dev
   ```
3. Buka `http://localhost:3001` di browser.
