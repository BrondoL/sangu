# Sangu

Perencana anggaran bulanan untuk satu orang. Menggantikan spreadsheet Excel yang
ditimpa tiap bulan, jadi riwayatnya hilang.

*Sangu* — bahasa Jawa/Sunda untuk bekal.

Satu pertanyaan yang dijawab aplikasi ini tiap gajian: **berapa yang harus
ditransfer dari rekening penerima gaji ke rekening proxy bulan ini.** Semua
halaman lain ada untuk membuat angka itu benar.

## Cara kerjanya

Dua lapis data. **Definisi** jarang berubah — rekening, pengeluaran rutin,
cicilan, target tabungan, gaji base. **Snapshot bulanan** dibuat dengan menyalin
definisi yang masih aktif, lalu disunting sesuai kenyataan bulan itu. Salinannya
mandiri: mengubah nominal bulan berjalan tidak menyentuh bulan lalu maupun
definisinya.

Nominal bulan baru mewarisi bulan sebelumnya kalau ada, karena angka riil
biasanya lebih dekat ke kebenaran daripada nilai definisi. Dua pengecualian:
cicilan selalu memakai nominal definisi, dan tagihan kartu kredit selalu mulai
dari nol.

Cicilan berhenti tergenerate sendiri begitu tenornya habis.

## Menjalankan

```bash
npm install
cp .env.local.example .env.local   # isi kedua nilainya
npm run dev
```

Keduanya dari Supabase → Project Settings → API. Tidak ada halaman registrasi;
satu user dibuat manual lewat dashboard Supabase dan signup dimatikan.

```bash
npm test        # Vitest
npm run lint
npm run build
```

## Aturan yang dipegang

- **Semua nominal integer rupiah.** Tidak pernah float. Diformat hanya di tepi UI.
- **Tidak ada perhitungan di komponen.** Semua angka berasal dari fungsi murni di
  `lib/` yang tidak menyentuh database, sehingga bisa diuji sepenuhnya. Komponen
  hanya menampilkan.
- **RLS di semua tabel**, dengan policy `user_id = auth.uid()`.
- **Peran rekening berupa flag**, bukan nilai hardcode. Penerima gaji dan proxy
  ditentukan lewat centang, jadi pindah bank cukup ganti centang.

## Struktur

```
lib/
  calculations.ts   mesin ringkasan bulanan (murni, teruji)
  generate.ts       perencana item bulan baru (murni, teruji)
  goals.ts          proyeksi target tabungan (murni, teruji)
  terbilang.ts      angka ke kata dalam Bahasa Indonesia (murni, teruji)
  month.ts          aritmetika bulan tanpa objek Date (murni, teruji)
  budget.ts         budget vs realisasi + saran setel ulang (murni, teruji)
  queries/          akses Supabase, satu file per domain
app/(app)/          dashboard · bulan ini · belanja · target · pengaturan
supabase/migrations/
```

## Dokumen

- [`docs/superpowers/specs/2026-08-03-sangu-design.md`](docs/superpowers/specs/2026-08-03-sangu-design.md)
  — spesifikasi, termasuk rumus perhitungan dan amandemennya. Tiap perubahan
  rumus setelah pemakaian nyata tercatat di sana beserta alasannya.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — status, keputusan desain, dan jebakan
  yang sudah ditemukan.
