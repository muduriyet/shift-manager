import {
  createClient,
  type SupabaseClient,
  type Session,
  type AuthChangeEvent,
} from '@supabase/supabase-js';

// Kullanıcı adı → kimlik. Supabase Auth e-posta tabanlı; kullanıcı adını sabit bir
// şirket domaini ile sentetik e-postaya çeviriyoruz. Bu domain GERÇEK bir posta
// kutusu değildir — yalnızca kimlik anahtarıdır. Kullanıcı UI'da sadece kullanıcı
// adını ("mert") görür/yazar. Tek değişim noktası burası.
export const AUTH_EMAIL_DOMAIN = 'coskunpetrol.com.tr';

// Kullanıcı adı kuralı: ASCII küçük harf/rakam/nokta (Türkçe harf/boşluk yok) —
// `.toLowerCase()` locale-bağımsızdır; İ/I/ı sürprizlerini önlemek için.
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string | undefined | null): string {
  if (!email) return '';
  const at = email.indexOf('@');
  return at === -1 ? email : email.slice(0, at);
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getConfigErrorMessage(): string | null {
  const missing = [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean);

  if (missing.length) {
    return `Supabase env eksik: ${missing.join(', ')}. .env.local dosyasını kontrol edin.`;
  }

  if (!isHttpUrl(supabaseUrl)) {
    return 'Supabase env hatalı: VITE_SUPABASE_URL geçerli bir http/https URL olmalı.';
  }

  return null;
}

export const supabaseConfigError = (() => {
  const message = getConfigErrorMessage();
  return message ? new SupabaseConfigError(message) : null;
})();

if (supabaseConfigError) {
  console.error(supabaseConfigError.message);
}

const client = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigError(error: unknown): error is SupabaseConfigError {
  return error instanceof SupabaseConfigError;
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    throw supabaseConfigError ?? new SupabaseConfigError('Supabase client oluşturulamadı.');
  }
  return client;
}

// ---- Kimlik doğrulama (Authentication) ----

// Kullanıcı adı + parola ile giriş. Hata fırlatırsa çağıran taraf Türkçe mesaja çevirir.
export async function signInWithUsername(username: string, password: string): Promise<Session> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) throw error;
  if (!data.session) throw new Error('Oturum oluşturulamadı.');
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session;
}

// Oturum değişimlerini (login/logout/token yenileme) dinler. Cleanup için
// aboneliği kaldıran bir fonksiyon döndürür.
export function onAuthChange(cb: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange(cb);
  return () => data.subscription.unsubscribe();
}

// Supabase'in (İngilizce) auth hatasını tek genel Türkçe mesaja çevirir.
// Güvenlik: kullanıcı adı mı parola mı yanlış, ayırmayız.
export function authErrorMessage(error: unknown): string {
  if (isSupabaseConfigError(error)) return error.message;
  const msg = (error as { message?: string })?.message ?? '';
  if (/email not confirmed/i.test(msg)) {
    return 'Hesap henüz onaylanmamış. Lütfen yöneticinize başvurun.';
  }
  if (/invalid login credentials/i.test(msg)) {
    return 'Kullanıcı adı veya şifre hatalı.';
  }
  // Ağ / beklenmedik hata
  return 'Giriş yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.';
}
