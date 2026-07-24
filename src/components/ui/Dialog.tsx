import type { ReactNode, CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { Button } from './Button';

interface DialogProps {
  title: string;
  desc?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: number;
  style?: CSSProperties;
}

// ---- Escape yığını ----
// Aynı anda birden fazla Dialog açık olabiliyor (ör. TaskModal + arşiv onayı).
// Her Dialog kendi dinleyicisini eklerse tek Escape hepsini birden kapatır; bu
// yüzden tek bir document dinleyicisi var ve yalnız yığının en üstündekini çağırır.
//
// Yığına onClose'un KENDİSİ değil, ref'i konuyor: çağrı yerlerinin çoğu satır içi
// arrow geçiyor (onClose={() => setX(false)}), yani her render'da kimlik değişiyor.
// Fonksiyonu doğrudan koysaydık effect'in bağımlılığı her render'da tetiklenir,
// dıştaki Dialog pop-push ile yığının tepesine çıkar ve Escape yanlış olanı
// kapatırdı — düzeltmeye çalıştığımız davranışın aynısı.
type CloseRef = { current: () => void };
const closeStack: CloseRef[] = [];

function onDocumentKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  closeStack[closeStack.length - 1]?.current();
}

function pushClose(ref: CloseRef) {
  if (closeStack.length === 0) document.addEventListener('keydown', onDocumentKey);
  closeStack.push(ref);
}

function popClose(ref: CloseRef) {
  const i = closeStack.lastIndexOf(ref);
  if (i > -1) closeStack.splice(i, 1);
  if (closeStack.length === 0) document.removeEventListener('keydown', onDocumentKey);
}

export function Dialog({ title, desc, children, footer, onClose, width, style }: DialogProps) {
  // Ref her render'da tazelenir; yığındaki sıra bundan etkilenmez.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    pushClose(closeRef);
    return () => popClose(closeRef);
  }, []);

  return (
    <div
      className="overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="dialog dialog-wrap"
        style={{ ...(width ? { maxWidth: width } : {}), ...style }}
      >
        <Button variant="ghost" size="sm" className="dialog-close" icon="x" onClick={onClose} />
        <div className="dialog-head">
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
        {children}
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}
