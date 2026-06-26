import { useState, type FormEvent } from 'react';
import { Input } from '../ui/Field';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { signInWithUsername, authErrorMessage } from '../../lib/supabase';

// Giriş ekranı — claude.ai/design `templates/giris/Giris.dc.html`'ten port edildi.
// Görünüm (mavi gradient + cam kart + Göster/Gizle + loading) korunur; mantık
// gerçek Supabase Auth'a (signInWithUsername) bağlıdır. "Beni hatırla" yok.
//
// Başarılı girişte App'teki onAuthChange aboneliği SIGNED_IN'i yakalar ve bu ekranı
// uygulamayla değiştirir; burada ayrıca bir yönlendirme yapmaya gerek yok.

const KEYFRAMES = `
@keyframes giris-card-in { from { transform: translateY(14px) scale(.985); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes giris-spin { to { transform: rotate(360deg); } }
@keyframes giris-slide-in { from { transform: translateY(-6px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes giris-bg { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
`;

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#ffffff' };
const errStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#fecaca' };

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [authError, setAuthError] = useState('');

  const isLoading = status === 'loading';
  const isDone = status === 'done';

  const emptyUser = submitted && !username.trim();
  const emptyPw = submitted && !password;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading || isDone) return;
    setSubmitted(true);
    setAuthError('');
    if (!username.trim() || !password) return;

    setStatus('loading');
    try {
      await signInWithUsername(username, password);
      // Başarılı: kısa "başarılı" durumu; App gate birazdan bu ekranı kaldırır.
      setStatus('done');
    } catch (err) {
      setStatus('idle');
      setAuthError(authErrorMessage(err));
    }
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background:
          'linear-gradient(135deg, #60a5fa 0%, #3b82f6 22%, #2563eb 45%, #1d4ed8 68%, #1e40af 84%, #18336f 100%)',
        backgroundSize: '300% 300%', animation: 'giris-bg 16s ease infinite',
        color: '#0f172a',
      }}
    >
      <style>{KEYFRAMES}</style>

      <div
        style={{
          flex: '1 1 0', minWidth: 0, width: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
        }}
      >
        <form
          onSubmit={onSubmit}
          style={{
            width: '100%', maxWidth: 404, display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
            background: 'linear-gradient(160deg, rgba(255,255,255,.42), rgba(255,255,255,.16))',
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            border: '1px solid rgba(255,255,255,.5)', borderRadius: 16,
            boxShadow: '0 24px 60px -18px rgba(8,17,46,.6), inset 0 1px 0 rgba(255,255,255,.65)',
            padding: '40px 36px', boxSizing: 'border-box',
            animation: 'giris-card-in .5s cubic-bezier(.2,.7,.2,1) both',
          }}
        >
          {isDone && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                padding: '11px 14px', borderRadius: 10, background: '#ecfdf5',
                border: '1px solid #a7f3d0', color: '#047857', fontSize: 13.5,
                fontWeight: 500, animation: 'giris-slide-in .3s ease both',
              }}
            >
              <Icon name="check" size={16} />
              Giriş başarılı! Yönlendiriliyorsunuz…
            </div>
          )}

          {authError && !isDone && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                padding: '11px 14px', borderRadius: 10, background: 'rgba(254,202,202,.22)',
                border: '1px solid rgba(248,113,113,.55)', color: '#fff', fontSize: 13.5,
                fontWeight: 500, animation: 'giris-slide-in .3s ease both',
              }}
            >
              <Icon name="alertCircle" size={16} />
              {authError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={labelStyle}>Kullanıcı Adı</span>
              <Input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setSubmitted(false); setAuthError(''); }}
                autoComplete="username"
                autoFocus
                error={emptyUser}
                disabled={isLoading || isDone}
              />
              {emptyUser && <span style={errStyle}>Kullanıcı adınızı girin</span>}
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={labelStyle}>Şifre</span>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setSubmitted(false); setAuthError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={emptyPw}
                  disabled={isLoading || isDone}
                  style={{ paddingRight: 62 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', top: 0, right: 0, height: '100%', padding: '0 13px',
                    border: 'none', background: 'transparent', color: '#64748b', fontSize: 12.5,
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {showPw ? 'Gizle' : 'Göster'}
                </button>
              </div>
              {emptyPw && <span style={errStyle}>Şifrenizi girin</span>}
            </label>

            <Button variant="primary" type="submit" disabled={isLoading || isDone} style={{ width: '100%' }}>
              {isLoading ? (
                <>
                  <span
                    style={{
                      width: 15, height: 15, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff',
                      display: 'inline-block', marginRight: 9, verticalAlign: -2,
                      animation: 'giris-spin .7s linear infinite',
                    }}
                  />
                  Giriş yapılıyor…
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>

            <p style={{ margin: 0, textAlign: 'center', fontSize: 12.5, color: 'rgba(255,255,255,.85)' }}>
              Şifrenizi unuttuysanız yöneticinize başvurun.
            </p>
          </div>
        </form>
      </div>

      <img
        src="/coskun-petrol-watermark.png"
        alt="Coşkun Petrol"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        style={{
          width: 'auto', height: 180, marginBottom: 40, opacity: 0.95,
          filter: 'drop-shadow(0 2px 8px rgba(8,17,46,.35))', position: 'relative',
        }}
      />
    </div>
  );
}
