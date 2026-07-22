# POS Envanteri Codex Handoff

Bu paket, POS Envanteri ekranını başka bir Codex oturumunda devralmak için hazırlandı.

## Durum

- İstenen özellik: İstasyondaki mevcut POS cihazlarını uygulamada görselleştirmek ve takip etmek.
- Kaynak Excel: `C:/Users/mehme/OneDrive/Desktop/coskun_petrol_pos_envanteri_renkli.xlsx`
- Excel sayfası: `POS Envanteri`
- Uygulama: `C:/VSCode/shift-manager`
- Framework: Vite + React + TypeScript
- Veri katmanı: Supabase helpers in `src/lib/db.ts`
- UI dili: Türkçe
- Kod implementasyonu henüz yapılmadı; bu paket tasarım ve uygulama kararlarını taşır.

## Onaylanan Kararlar

- Veri akışı: Excel ilk kayıtları seed/import eder; sonrasında uygulama editable source of truth olur.
- V1 kapsamı: Dashboard + table ekranı.
- V1 granülerlik: Provider/banka bazlı aggregate POS kaydı; tek tek cihaz seri numarası takibi yok.
- Modal tasarımı: `Yeni POS Kaydı` için iki kolonlu form + canlı özet paneli + footer aksiyonları.

## Kabul Edilen Tasarım Görselleri

- Dashboard/table screen: `pos-inventory-dashboard-concept.png`
- Yeni POS Kaydı modalı: `pos-new-record-modal-concept.png`

## Excel Veri Özeti

Toplamlar:

- Toplam POS: `38`
- Aktif: `22`
- Pasif: `16`
- Kurulum bekleyen: `4`

Kurulum bekleyen sayısı, `Cihaz Tipi / Sahiplik` alanında `Beko 430TR — Kurulum yapılacak` geçen satırlardan türetilir. Bu cihazlar pasif toplamın alt kümesi kabul edildi.

Seed verisi `pos-inventory-seed.json` dosyasındadır.

## Uygulama Planı

1. Supabase şeması ekle:
   - `pos_inventory_items`
   - Kolonlar: `id`, `station`, `department`, `provider`, `pos_count`, `active_count`, `passive_count`, `setup_pending_count`, `commission_rate`, `device_type`, `note`, `created_at`, `updated_at`
   - RLS: mevcut pattern ile authenticated full access.

2. TypeScript tipleri ve DB helpers ekle:
   - `PosInventoryItem`
   - `PosInventoryForm`
   - `fetchPosInventoryItems`
   - `createPosInventoryItem`
   - `updatePosInventoryItem`
   - `deletePosInventoryItem`

3. Navigation ekle:
   - `ViewId` içine `pos`
   - Sidebar item label: `POS Envanteri`
   - Icon önerisi: mevcut `Icon` setine terminal/card/device benzeri yeni ikon eklenebilir; yoksa geçici olarak `clipboard` veya `layers`.

4. Screen oluştur:
   - Dosya önerisi: `src/components/pos/PosInventoryScreen.tsx`
   - Header: `POS Envanteri`
   - Description: `İstasyonlardaki POS cihazlarını, aktif/pasif durumlarını ve komisyon bilgilerini takip edin.`
   - Actions: `Excel’den İçe Aktar`, `Yeni POS Kaydı`
   - KPI row: Toplam POS, Aktif, Pasif, Kurulum Bekleyen
   - Filters: istasyon, departman, durum segmenti, arama input
   - Main table: İstasyon, Departman, Banka/Kurum, POS Adedi, Aktif, Pasif, Komisyon, Cihaz Tipi / Sahiplik, Not
   - Right panel: İstasyon bazlı dağılım + Dikkat Gerekenler

5. Modal oluştur:
   - Dosya önerisi: `src/components/pos/PosInventoryModal.tsx`
   - Alanlar: İstasyon, Departman, Banka / Kurum, POS Adedi, Aktif, Pasif, Kurulum Bekleyen, Komisyon Oranı, Cihaz Tipi / Sahiplik, Not
   - Validasyon: `active_count + passive_count === pos_count`
   - Validasyon: `setup_pending_count <= passive_count`
   - Footer: `Vazgeç`, `Kaydı Ekle`

6. Excel import:
   - `xlsx` dependency mevcut.
   - Parser station heading, department heading, repeated header rows ve A-G kolonlarını okumalı.
   - Import preview satırları, toplamları ve validasyon hatalarını göstermeli.
   - V1 için import apply tüm POS envanterini replace edebilir; ileride diff tabanlı update eklenebilir.

## Test/Doğrulama

- `npm run build`
- Dashboard toplamları seed JSON ile birebir tutmalı: `38 / 22 / 16 / 4`
- Filtreler ve search birlikte çalışmalı.
- Add/edit modal validation çalışmalı.
- Mobilde filtreler stack olmalı, tablo yatay scroll ile okunmalı.
- Excel import parser aynı workbook ile 11 satır üretmeli.

