import type { Onboarding, OnboardingDocSet, OnboardingStage } from '../types';

// İşe Giriş Süreçleri — saf sabitler ve türetmeler.
// React/supabase importu YOK; tüm hesaplar buradan tek kaynaktan çıkar.

// ---- Aşamalar ----
// stage = ULAŞILAN kilometre taşı. stage=1 "mail atıldı" demek, "mail bekleniyor" değil.
// Etiketlerin üçü de farklı bağlam içindir:
//   title     → detaydaki stepper başlığı ("1. İşe Giriş Maili Atıldı")
//   short     → listedeki Süreç Adımı kolonu (dar, geçmiş zamanlı)
//   statLabel → stat kartı; ulaşılan adımı değil ŞU AN TOPLANAN evrak setini anlatır
export interface StageDef {
  n: OnboardingStage;
  title: string;
  short: string;
  statLabel: string;
  icon: string;
}

export const STAGES: readonly StageDef[] = [
  { n: 1, title: 'İşe Giriş Maili Atıldı',          short: 'İşe giriş maili atıldı', statLabel: 'Personel Evrak Bekleniyor', icon: 'inbox' },
  { n: 2, title: 'SGK Girişi Yapıldı',              short: 'SGK girişi yapıldı',     statLabel: 'Giriş Evrak Bekleniyor',    icon: 'userCheck' },
  { n: 3, title: 'Evrak Asılları Muhasebeye Geldi', short: 'Evrak asılları geldi',   statLabel: 'Tamamlandı',                icon: 'clipboard' },
] as const;

export function stageDef(stage: OnboardingStage): StageDef {
  return STAGES[stage - 1];
}

// ---- Evrak setleri ----
// "Giriş Evrak" gönderilir (SGK'ya), diğer ikisi gelir (muhasebeye) — sütun ve
// pill etiketleri bu yüzden set bazında değişiyor.
export interface DocSetDef {
  id: OnboardingDocSet;
  stage: OnboardingStage;
  title: string;
  doneCol: string;
  notDoneCol: string;
  doneLabel: string;
  notDoneLabel: string;
}

export const DOC_SETS: readonly DocSetDef[] = [
  { id: 'personel', stage: 1, title: 'Personel Evrak', doneCol: 'Evrak Adı', notDoneCol: 'Gelmedi',      doneLabel: 'Geldi',      notDoneLabel: 'Gelmedi' },
  { id: 'giris',    stage: 2, title: 'Giriş Evrak',    doneCol: 'Evrak Adı', notDoneCol: 'Gönderilmedi', doneLabel: 'Gönderildi', notDoneLabel: 'Gönderilmedi' },
  { id: 'asil',     stage: 3, title: 'Evrak Aslı',     doneCol: 'Evrak Adı', notDoneCol: 'Gelmedi',      doneLabel: 'Geldi',      notDoneLabel: 'Gelmedi' },
] as const;

export function docSetDef(id: OnboardingDocSet): DocSetDef {
  return DOC_SETS.find(s => s.id === id) ?? DOC_SETS[0];
}

// Sürecin bulunduğu aşamada toplanan set.
export function activeDocSet(stage: OnboardingStage): DocSetDef {
  return DOC_SETS[stage - 1];
}

// ---- Sayaçlar ----
// Kaynak: onboarding_list_view'ın altı sayacı. Ayrı sorgu gerekmez.
export function docCount(o: Onboarding, set: OnboardingDocSet): { done: number; total: number } {
  if (set === 'personel') return { done: o.personelDone, total: o.personelTotal };
  if (set === 'giris')    return { done: o.girisDone,    total: o.girisTotal };
  return { done: o.asilDone, total: o.asilTotal };
}

// Listedeki Evrak kolonu: aşamaya göre payda değişir (6 → 2 → 9).
export function activeDocCount(o: Onboarding): { done: number; total: number; set: DocSetDef } {
  const set = activeDocSet(o.stage);
  return { ...docCount(o, set.id), set };
}

// Tüm asıllar geldi mi? Tamamlanmayı BELİRLEMEZ (bkz. isComplete); yalnız
// Evrak Aslı kartının altındaki yeşil "hepsi teslim alındı" satırını sürer.
export function allOriginalsReceived(o: Onboarding): boolean {
  return o.asilTotal > 0 && o.asilDone === o.asilTotal;
}

// ---- Tamamlanma ----
// Aşama tek belirleyici; evrak tikleri bilgi amaçlı. Kullanıcı 3. adıma
// tıkladığında süreç biter ve modal kapanışında arşivlenir.
// Not: tasarımdaki "|| hepsiGeldi" dalı alınmadı — oradaki asama gerçek veri
// değil, tasarımcının önizleme için elle çevirdiği bir prop'tu.
export function isComplete(o: Onboarding): boolean {
  return o.stage >= 3;
}

// ---- Stepper durumu ----
export type StepStatus = 'tamam' | 'devam' | 'bekleme';

export function stepStatus(o: Onboarding, k: OnboardingStage): StepStatus {
  if (isComplete(o))      return 'tamam';   // tamamlanmış süreçte üç adım da tamam
  if (k <= o.stage)       return 'tamam';
  if (k === o.stage + 1)  return 'devam';
  return 'bekleme';
}

export const STEP_BADGE: Record<StepStatus, { label: string; status: string; dot: boolean }> = {
  tamam:   { label: 'Tamamlandı',   status: 'Geldi',      dot: false },
  devam:   { label: 'Devam Ediyor', status: 'Aktif',      dot: true  },
  bekleme: { label: 'Beklemede',    status: 'Planlandı',  dot: false },
};

// ---- Tarih ----
// Tasarımdaki gg.aa.yyyy. slice(0,10) hem 'YYYY-MM-DD' hem ISO timestamp'i karşılar.
export function fmtDMY(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

// ---- Arama ----
// Türkçe küçültme iki tarafa da uygulanmalı: İ→i̇, I→ı. Aksi halde "İş" ile
// "iş" eşleşmez ve evrak/personel adları İ/Ö/Ğ dolu.
export function trLower(s: string): string {
  return s.toLocaleLowerCase('tr');
}
