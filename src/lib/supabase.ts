import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
