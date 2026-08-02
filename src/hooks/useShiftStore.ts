import { useCallback, useRef, useState } from 'react';
import type { Shift } from '../types';
import { fetchShiftsInRange } from '../lib/db';
import { monthBounds, yearMonthOf } from '../constants';

// Vardiyalar ay ay (YYYY-MM) çekilir ve bellekte biriktirilir. Ekranlar hangi
// ayı gösteriyorsa onu ensureMonths ile ister; daha önce çekilmiş aylar tekrar
// istenmez. Böylece açılış maliyeti tablo büyüdükçe artmaz.
//
// shifts düz bir dizidir: mevcut ekranların hepsi zaten dizi üzerinde filtre
// yaptığı ve mutasyonlar (setShifts) bu diziyi güncellediği için ay->dizi
// haritası yerine "düz dizi + yüklenmiş aylar kümesi" tutuluyor.

export interface ShiftStore {
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  /** Verilen ayları (yoksa) yükler. Zaten yüklü/yükleniyorsa tekrar istek atmaz. */
  ensureMonths: (months: string[]) => Promise<void>;
  /**
   * Verilen ayları yüklü olsalar da sunucudan tazeler. Toplu yazmadan sonra
   * gerekir: import kayıtları silip yeniden oluşturduğu için id'ler değişir,
   * bellekteki kopya sunucudaki gerçekle uyuşmaz.
   */
  reloadMonths: (months: string[]) => Promise<void>;
  /** true ise ay henüz gelmedi — ekran "veri yok" yerine yükleniyor göstermeli. */
  isMonthPending: (yearMonth: string) => boolean;
  /**
   * Ay bellekte hazır mı. Mevcut kayıtlara göre karar veren işlemler (Excel
   * içe/dışa aktarma) bunu beklemeden çalışmamalı: eksik veriyle çalışan bir
   * import planı, var olan vardiyaları "yeni" sanıp yinelenen kayıt üretir.
   */
  isMonthLoaded: (yearMonth: string) => boolean;
  /** Herhangi bir ay yükleniyor mu (ince yükleme göstergesi için). */
  anyPending: boolean;
  /** Son yükleme hatası; null ise sorun yok. */
  loadError: string | null;
  reset: () => void;
}

export function useShiftStore(): ShiftStore {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Ref'ler senkron: aynı render turunda arka arkaya gelen ensureMonths
  // çağrılarının aynı ay için iki istek açmasını engeller.
  const loadedRef  = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());

  const ensureMonths = useCallback(async (months: string[]) => {
    const missing = Array.from(new Set(months)).filter(
      ym => ym && !loadedRef.current.has(ym) && !pendingRef.current.has(ym),
    );
    if (!missing.length) return;

    missing.forEach(ym => pendingRef.current.add(ym));
    setPending(Array.from(pendingRef.current));

    await Promise.all(missing.map(async ym => {
      try {
        const { start, end } = monthBounds(ym);
        const rows = await fetchShiftsInRange(start, end);
        loadedRef.current.add(ym);
        // Ayı yeniden yüklerken eski satırları at: aynı kaydın iki kez
        // görünmesini önler (ör. ay tekrar istendiğinde).
        setShifts(prev => [...prev.filter(s => yearMonthOf(s.shiftDate) !== ym), ...rows]);
        setLoaded(Array.from(loadedRef.current));
        setLoadError(null);
      } catch (err) {
        console.error(`Vardiyalar yüklenemedi (${ym}):`, err);
        setLoadError('Vardiyalar yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
      } finally {
        pendingRef.current.delete(ym);
        setPending(Array.from(pendingRef.current));
      }
    }));
  }, []);

  const reloadMonths = useCallback(async (months: string[]) => {
    const targets = Array.from(new Set(months)).filter(Boolean);
    if (!targets.length) return;
    // "Yüklendi" işaretini kaldır ki ensureMonths tekrar çeksin.
    targets.forEach(ym => loadedRef.current.delete(ym));
    setLoaded(Array.from(loadedRef.current));
    await ensureMonths(targets);
  }, [ensureMonths]);

  const isMonthPending = useCallback(
    (yearMonth: string) => pending.includes(yearMonth),
    [pending],
  );

  const isMonthLoaded = useCallback(
    (yearMonth: string) => loaded.includes(yearMonth),
    [loaded],
  );

  const reset = useCallback(() => {
    loadedRef.current = new Set();
    pendingRef.current = new Set();
    setShifts([]);
    setPending([]);
    setLoaded([]);
    setLoadError(null);
  }, []);

  return {
    shifts, setShifts, ensureMonths, reloadMonths, isMonthPending, isMonthLoaded,
    anyPending: pending.length > 0, loadError, reset,
  };
}
