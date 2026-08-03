# Sangu — Aplikasi Pencatatan Keuangan Pribadi

**Tanggal:** 2026-08-03
**Status:** Disetujui, siap masuk tahap perencanaan implementasi

## Ringkasan

Sangu menggantikan spreadsheet Excel yang dipakai untuk merencanakan keuangan bulanan. Aplikasi web (PWA) untuk satu pengguna, dibangun dengan Next.js dan Supabase, di-deploy ke Vercel.

Perbedaan utama dari Excel: riwayat tersimpan permanen. Excel saat ini ditimpa tiap bulan, sehingga data bulan lalu hilang.

Nama "Sangu" diambil dari bahasa Jawa/Sunda yang berarti bekal atau uang saku — sesuai fungsinya menyiapkan bekal tiap bulan.

## Masalah yang Diselesaikan

Tiap bulan sebelum gajian, pengguna perlu menjawab:

1. Berapa total pengeluaran bulan ini?
2. Cukupkah gaji bulan ini menutupinya?
3. Berapa yang harus ditransfer dari rekening penerima gaji ke rekening proxy?
4. Berapa kebutuhan masing-masing rekening?
5. Sudah menabung untuk target jangka panjang atau belum?

Excel menjawab semua ini, tapi tanpa riwayat, tanpa grafik, dan cicilan yang habis tenor harus dihapus manual.

## Konsep Inti

Aplikasi memakai model **template + snapshot bulanan** dengan dua lapis data.

**Lapis definisi** berisi hal-hal yang jarang berubah: daftar rekening, expense rutin, cicilan, target tabungan, gaji base. Diisi sekali di awal.

**Lapis bulanan** berisi satu set data per bulan. Saat bulan baru dimulai, aplikasi menyalin definisi yang masih aktif menjadi baris-baris bulan itu. Pengguna menyunting yang berubah dan mengisi tagihan kartu kredit.

Salinan bersifat mandiri, bukan referensi hidup. Mengubah nominal di bulan berjalan tidak menyentuh bulan-bulan lama maupun definisi.

Alasan pemilihan model ini: pengguna tidak sedang melacak transaksi yang sudah terjadi, melainkan merencanakan bulan yang belum berjalan lalu menandainya saat terlaksana. Model ledger transaksi murni tidak cocok untuk pertanyaan "berapa yang harus saya transfer bulan depan".

## Model Data

### Lapis Definisi

**accounts**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK ke auth.users |
| name | text | misal "BCA", "Jago" |
| is_salary_receiver | boolean | penerima gaji |
| is_proxy | boolean | rekening transit |
| has_credit_card | boolean | punya kartu kredit |
| is_active | boolean | soft delete |
| sort_order | integer | urutan tampilan |

Peran rekening ditentukan lewat flag, bukan nilai hardcode. Kalau nanti proxy pindah bank, cukup ganti centang.

Aturan: tepat satu rekening boleh `is_salary_receiver = true`, dan tepat satu boleh `is_proxy = true`. Ditegakkan lewat partial unique index.

**recurring_expenses**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| name | text | |
| default_amount | bigint | rupiah, integer |
| account_id | uuid | FK accounts |
| payment_method | enum | `debit` \| `credit` |
| is_active | boolean | |

**installments**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| name | text | |
| monthly_amount | bigint | |
| tenor_months | integer | |
| start_month | date | tanggal 1 bulan mulai |
| account_id | uuid | FK accounts |
| payment_method | enum | `debit` \| `credit` |

Bulan selesai dihitung: `start_month + tenor_months - 1`. Tidak disimpan agar tidak bisa tidak sinkron.

**savings_goals**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| name | text | misal "Beli Rumah" |
| target_amount | bigint | nullable — saving tanpa target nominal |
| monthly_amount | bigint | setoran per bulan |
| account_id | uuid | rekening tujuan |
| target_date | date | nullable |
| is_active | boolean | |

**settings**
| Kolom | Tipe | Keterangan |
|---|---|---|
| user_id | uuid | primary key |
| base_salary | bigint | gaji pokok patokan |

**Kategori** tidak disimpan sebagai tabel. Nilainya tetap dan semua rumus bergantung padanya: `expense`, `installment`, `saving`, `card_bill`. Dideklarasikan sebagai enum Postgres.

### Lapis Bulanan

**monthly_periods**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| month | date | tanggal 1 bulan tersebut |
| actual_salary | bigint | gaji yang benar-benar masuk |
| note | text | catatan bebas, nullable |

Unique pada `(user_id, month)`.

**monthly_items**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | |
| period_id | uuid | FK monthly_periods |
| name | text | |
| amount | bigint | |
| account_id | uuid | FK accounts |
| category | enum | expense/installment/saving/card_bill |
| payment_method | enum | debit \| credit, default `debit` |
| is_paid | boolean | |
| source_type | enum | nullable: recurring/installment/saving |
| source_id | uuid | nullable, referensi definisi asal |

`source_type` dan `source_id` hanya menandai asal-usul dan mencegah duplikat saat generate. Nominal dan nama tidak pernah dibaca ulang dari definisi.

Item bisa juga dibuat manual tanpa `source_id` untuk pengeluaran insidental.

**monthly_balances**
| Kolom | Tipe | Keterangan |
|---|---|---|
| period_id | uuid | |
| account_id | uuid | |
| balance | bigint | saldo saat input |

Primary key gabungan `(period_id, account_id)`.

Tagihan kartu kredit tidak punya tabel sendiri — dicatat sebagai `monthly_items` berkategori `card_bill`.

### Satuan Nominal

Semua nominal disimpan sebagai `bigint` dalam satuan rupiah penuh, bukan desimal. Menghindari galat pembulatan floating point. Format tampilan dilakukan di lapisan UI.

## Mesin Perhitungan

Seluruh angka dashboard berasal dari satu fungsi murni di `lib/calculations.ts`. Fungsi ini menerima data satu bulan dan mengembalikan objek ringkasan. Tidak ada akses database di dalamnya, dan tidak ada komponen UI yang menghitung sendiri.

### Urutan Perhitungan

**1. Total pengeluaran**
Jumlah `amount` semua `monthly_items` bulan itu, semua kategori.

Expense bermetode kredit dan item `card_bill` sama-sama dihitung. Keduanya bukan duplikasi: expense kredit adalah belanja bulan ini yang tagihannya datang bulan depan (uangnya disiapkan sekarang), sedangkan `card_bill` adalah tagihan belanja bulan lalu yang jatuh tempo bulan ini. Dua-duanya keluar dari kantong bulan yang sama.

**2. Kebutuhan per rekening**
Pengeluaran dikelompokkan per `account_id`, mengabaikan `payment_method`. Belanja debit dan kredit dari bank yang sama menyatu menjadi satu angka.

**3. Kekurangan per rekening**
```
shortfall[akun] = max(0, kebutuhan[akun] - saldo[akun])
```
Dibatasi nol. Rekening yang saldonya berlebih tidak mengurangi kebutuhan rekening lain — uang itu sudah berada di tempatnya dan memindahkannya butuh transfer manual yang tidak direncanakan.

**4. Kekurangan rekening penerima gaji**
Disisihkan. Uang untuk ini tetap tinggal di rekening penerima gaji, tidak ikut dikirim ke proxy.

**5. Sisa gaji**
```
sisa = gaji_aktual - total_semua_kekurangan
```
Nilai negatif berarti bulan itu tekor, dan besarannya langsung terlihat.

**6. Transfer ke proxy**
```
transfer = jumlah_kekurangan_rekening_non_penerima_gaji + max(0, sisa_gaji)
```
Sisa gaji ikut dikirim ke proxy sebagai uang bebas, siap diteruskan ke rekening tabungan.

### Contoh Perhitungan

Gaji base 20.000.000, gaji aktual 22.000.000.

| Rekening | Peran | Kebutuhan | Saldo | Kekurangan |
|---|---|---|---|---|
| BCA | penerima gaji | 2.000.000 | 500.000 | 1.500.000 |
| Jago | proxy | 3.000.000 | 0 | 3.000.000 |
| Mandiri | — | 5.000.000 | 1.000.000 | 4.000.000 |
| BRI | — | 1.000.000 | 1.500.000 | 0 |

Total pengeluaran 11.000.000. Total kekurangan 8.500.000.

Sisa gaji = 22.000.000 − 8.500.000 = 13.500.000.

Transfer ke proxy = (3.000.000 + 4.000.000 + 0) + 13.500.000 = 20.500.000.

BRI tidak menerima transfer karena saldonya sudah melebihi kebutuhan, dan kelebihan 500.000 itu tidak mengurangi kebutuhan rekening lain. BCA menahan 1.500.000 untuk pengeluarannya sendiri.

### Keluaran Tambahan

**Cek kecukupan** ditampilkan dua baris: terhadap gaji base dan terhadap gaji aktual. Selisihnya langsung terlihat saat ada bonus atau potongan.

**Sisa belum dibayar** — jumlah `amount` item dengan `is_paid = false`. Jadi pegangan saat pembayaran dilakukan bertahap setelah gajian.

**Rincian per kategori** — total tiap kategori, untuk pie chart.

### Kasus Tepi

| Kondisi | Perilaku |
|---|---|
| Belum ada rekening ber-flag proxy | Dashboard tampilkan peringatan, angka transfer tidak dihitung |
| Belum ada rekening penerima gaji | Sama seperti di atas |
| Saldo suatu rekening belum diisi | Dianggap nol |
| Tidak ada item sama sekali | Semua angka nol, tidak error |
| Gaji aktual belum diisi | Perhitungan tetap jalan, baris kecukupan aktual disembunyikan |
| Rekening dinonaktifkan padahal masih dipakai item bulan lama | Bulan lama tetap menampilkannya; rekening nonaktif tidak ikut tergenerate ke bulan baru |

## Generate Bulan Baru

Dipicu tombol "Mulai bulan baru" di halaman Bulan Berjalan. Bersifat idempoten — dijalankan dua kali tidak menggandakan data, karena `source_id` yang sudah ada di bulan itu akan dilewati.

**Yang disalin:**

- Semua `recurring_expenses` aktif
- `installments` yang bulan targetnya masih dalam rentang `start_month` sampai `start_month + tenor - 1`. Cicilan lunas otomatis tidak ikut, tanpa perlu dihapus manual.
- Semua `savings_goals` aktif
- Satu item `card_bill` bernominal nol untuk tiap rekening ber-`has_credit_card`

**Penentuan nominal:**

Untuk expense dan saving, dicari padanan di bulan sebelumnya berdasarkan `source_id`. Bila ada, dipakai nominal bulan lalu — angka riil biasanya lebih dekat kebenaran daripada nilai definisi. Bila tidak ada, dipakai nominal definisi.

Dua pengecualian:

- **Cicilan** selalu memakai nominal definisi. Angkanya tetap, dan kesalahan di satu bulan akan menular ke seluruh bulan berikutnya bila diwariskan.
- **Tagihan CC** selalu dimulai nol. Angkanya berbeda jauh tiap bulan; mewarisi angka bulan lalu berisiko membuat pengguna mengira sudah mengisi.

Bila bulan sebelumnya tidak pernah digenerate, pewarisan nominal melewatinya dan langsung memakai nilai definisi. Aplikasi tidak membuat bulan-bulan yang terlewat secara otomatis.

**Penyuntingan nominal di bulan berjalan tidak memperbarui definisi.** Perubahan hanya berlaku untuk bulan itu. Karena bulan berikutnya mewarisi nominal bulan lalu, nilai terbaru tetap terbawa sendiri tanpa perlu menyentuh definisi.

## Halaman

### Dashboard

Halaman utama setelah login. Ada pemilih bulan di bagian atas untuk melihat bulan mana pun.

Kartu ringkasan: gaji aktual, total pengeluaran, status cukup/minus terhadap base dan aktual, serta angka besar "transfer ke proxy".

Tabel per rekening: kebutuhan, saldo, kekurangan.

Progress bar item yang sudah dibayar.

Pie chart pengeluaran per rekening dan per kategori. Line chart tren total pengeluaran antar bulan.

### Bulan Berjalan

Tempat kerja utama. Panel atas berisi input gaji aktual dan saldo tiap rekening — dua hal yang diisi lebih dulu tiap bulan.

Daftar `monthly_items` dikelompokkan per kategori. Tiap baris punya nominal yang bisa disunting langsung dan checkbox lunas. Ada tombol menambah item insidental.

Bila bulan itu belum digenerate, yang tampil adalah tombol "Mulai bulan baru".

Kolom catatan bebas untuk mencatat kejadian tak biasa bulan itu.

### Target

Daftar target tabungan dengan progress bar. Akumulasi dihitung dari item saving berstatus lunas di seluruh bulan.

Tiap target menampilkan: terkumpul berapa, kurang berapa, estimasi bulan tercapai berdasarkan setoran bulanan, dan status on-track terhadap `target_date` bila diisi.

Rumusnya:

```
terkumpul  = jumlah amount item saving is_paid=true dengan source_id target itu,
             di seluruh periode
sisa       = max(0, target_amount - terkumpul)
bulan_lagi = ceil(sisa / monthly_amount)
estimasi   = bulan_berjalan + bulan_lagi
on_track   = estimasi <= target_date
```

Target tanpa `target_amount` hanya menampilkan akumulasi, tanpa progress bar maupun estimasi. Bila `monthly_amount` nol, estimasi tidak ditampilkan.

Ceklis "sudah menabung bulan ini" terisi otomatis dari `is_paid` item saving di bulan berjalan. Tidak ada input ganda.

### Pengaturan

Kelola rekening (termasuk menentukan penerima gaji dan proxy), expense rutin, cicilan, target tabungan, dan gaji base.

## Alur Bulanan Pengguna

1. Buka Bulan Berjalan
2. Klik "Mulai bulan baru"
3. Isi gaji aktual dan saldo tiap rekening
4. Sunting nominal yang berubah
5. Isi total tagihan tiap kartu kredit
6. Buka Dashboard untuk melihat berapa yang harus ditransfer ke proxy
7. Centang lunas seiring pembayaran berjalan

## Teknologi

| Aspek | Pilihan |
|---|---|
| Framework | Next.js App Router, TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Grafik | Recharts |
| Database & Auth | Supabase |
| Deploy | Vercel |
| Testing | Vitest |

### Autentikasi

Supabase Auth dengan email dan password. Satu user dibuat manual lewat dashboard Supabase; tidak ada halaman registrasi dan signup dimatikan di pengaturan proyek.

Row Level Security aktif di semua tabel dengan policy `user_id = auth.uid()`. Meski hanya satu pengguna, ini menutup celah bila anon key bocor.

### Struktur Kode

```
lib/
  calculations.ts     fungsi murni, tanpa akses database
  queries/            query Supabase, satu file per domain
  supabase/           client browser dan server
app/
  (auth)/login/
  (app)/dashboard/
  (app)/current/
  (app)/goals/
  (app)/settings/
components/
  ui/                 shadcn
  ...                 komponen fitur, hanya menampilkan
```

Komponen UI tidak menghitung apa pun. Batas ini yang membuat rumus dapat diuji dan tidak berlipat ganda di banyak tempat.

### PWA

Manifest, ikon, dan service worker untuk shell aplikasi agar dapat dipasang di ponsel dan terbuka cepat. Bukan offline-first — data tetap memerlukan koneksi. Aplikasi dipakai sebulan sekali saat gajian, bukan dalam kondisi tanpa sinyal.

## Testing

Vitest untuk mesin perhitungan. Kasus yang wajib ada:

- Bulan normal, semua rekening punya saldo
- Bulan minus, gaji tidak menutupi pengeluaran
- Saldo suatu rekening melebihi kebutuhannya
- Cicilan yang tepat habis tenor bulan itu
- Cicilan yang sudah lewat tenor — tidak boleh ikut tergenerate
- Belum ada rekening ber-flag proxy atau penerima gaji
- Expense kredit dan tagihan CC pada rekening yang sama — dijumlahkan, bukan dianggap duplikat
- Generate dijalankan dua kali — tidak menggandakan data

Antarmuka tidak diuji otomatis. Pengguna adalah pengembangnya sendiri; biaya-manfaatnya tidak sepadan.

## Di Luar Cakupan

Sengaja tidak dibangun sekarang:

- **Impor dari Excel** — data rutin tidak banyak, cukup diinput manual sekali
- **Notifikasi jatuh tempo** — butuh cron dan email, sementara aplikasi dibuka tiap gajian
- **Multi-currency**
- **Export PDF**
- **Kategori kustom** — empat kategori tetap sudah memadai
- **Pencatatan transaksi kartu kredit satu per satu** — cukup total tagihan per kartu
- **Multi-user dan registrasi**

Semuanya dapat ditambahkan kemudian bila ternyata dibutuhkan.
