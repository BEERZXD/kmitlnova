import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { AppFooter } from './AppFooter';

const loginImagesConfigUrl = '/login-images.txt';
const loginImageCycleMs = 5000;
const defaultLoginImagePosition = '50% 50%';
const defaultLoginImage = {
  src: 'https://i.ibb.co/Q7DCbnLb/922885a5670a.jpg',
  objectPosition: '50% 75%',
};
const fallbackLoginImages = [defaultLoginImage];

type LoginImageEntry = {
  src: string;
  objectPosition: string;
};

function parseLoginImageLine(line: string): LoginImageEntry {
  const separatorIndex = line.indexOf('|');

  if (separatorIndex === -1) {
    return {
      src: line,
      objectPosition: defaultLoginImagePosition,
    };
  }

  const src = line.slice(0, separatorIndex).trim();
  const objectPosition = line.slice(separatorIndex + 1).trim();

  return {
    src,
    objectPosition: objectPosition || defaultLoginImagePosition,
  };
}

export function parseLoginImageList(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map(parseLoginImageLine)
    .filter((image) => image.src.length > 0);
}

export function getLoginImageClassName(
  imageIndex: number,
  activeLoginImageIndex: number,
  lastLoadedIndex: number | null = null,
  loadedLoginImageIndexes: Set<number> = new Set(),
) {
  const isLoaded = loadedLoginImageIndexes.has(imageIndex);

  if (imageIndex === activeLoginImageIndex && (isLoaded || loadedLoginImageIndexes.size === 0)) {
    return 'login-visual-image active';
  }

  if (
    !loadedLoginImageIndexes.has(activeLoginImageIndex) &&
    imageIndex === lastLoadedIndex
  ) {
    return 'login-visual-image active';
  }

  return 'login-visual-image inactive';
}

export function getNextLoginImageIndex(imageCount: number, activeLoginImageIndex: number) {
  if (imageCount < 2) return activeLoginImageIndex;
  return (activeLoginImageIndex + 1) % imageCount;
}

export function getRenderableLoginImageIndexes(
  imageCount: number,
  activeLoginImageIndex: number,
  loadedImageIndexes: Iterable<number>,
  shouldRenderNextImage = false,
) {
  if (imageCount <= 0) return [];

  const indexes = new Set<number>();
  for (const imageIndex of loadedImageIndexes) {
    if (imageIndex >= 0 && imageIndex < imageCount) indexes.add(imageIndex);
  }
  indexes.add(activeLoginImageIndex);
  if (shouldRenderNextImage) {
    indexes.add(getNextLoginImageIndex(imageCount, activeLoginImageIndex));
  }

  return [...indexes].sort((a, b) => a - b);
}

export function isLoginSubmitKey(event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'isComposing'>) {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing;
}

type LoginViewProps = {
  error: string;
  isLoading: boolean;
  onSubmit: (studentId: string, password: string) => Promise<void>;
  onSuccess: () => void;
};

export function LoginView({ error, isLoading, onSubmit, onSuccess }: LoginViewProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loginImages, setLoginImages] = useState(fallbackLoginImages);
  const [activeLoginImageIndex, setActiveLoginImageIndex] = useState(0);
  const [loadedLoginImageIndexes, setLoadedLoginImageIndexes] = useState<Set<number>>(() => new Set());
  const [lastLoadedIndex, setLastLoadedIndex] = useState<number | null>(null);
  const [shouldRenderNextLoginImage, setShouldRenderNextLoginImage] = useState(false);

  useEffect(() => {
    let isActive = true;

    fetch(loginImagesConfigUrl)
      .then((response) => (response.ok ? response.text() : ''))
      .then((text) => {
        if (!isActive) return;
        const configuredImages = parseLoginImageList(text);
        setLoginImages(configuredImages.length > 0 ? configuredImages : fallbackLoginImages);
        setActiveLoginImageIndex(0);
        setLoadedLoginImageIndexes(new Set());
        setLastLoadedIndex(null);
        setShouldRenderNextLoginImage(false);
      })
      .catch(() => {
        if (!isActive) return;
        setLoginImages(fallbackLoginImages);
        setActiveLoginImageIndex(0);
        setLoadedLoginImageIndexes(new Set());
        setLastLoadedIndex(null);
        setShouldRenderNextLoginImage(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let timeoutId: number | undefined;
    let idleCallbackId: number | undefined;

    if (typeof window.requestIdleCallback === 'function') {
      idleCallbackId = window.requestIdleCallback(() => {
        setShouldRenderNextLoginImage(true);
      }, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(() => {
        setShouldRenderNextLoginImage(true);
      }, 1200);
    }

    return () => {
      if (idleCallbackId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [loginImages]);

  useEffect(() => {
    if (loginImages.length < 2) return;

    const intervalId = window.setInterval(() => {
      setActiveLoginImageIndex((currentIndex) => (currentIndex + 1) % loginImages.length);
    }, loginImageCycleMs);

    return () => window.clearInterval(intervalId);
  }, [loginImages.length]);

  async function submitLogin() {
    if (isLoading || isAnimating) return;
    try {
      await onSubmit(studentId.trim(), password);
      setIsAnimating(true);
      setTimeout(() => {
        onSuccess();
      }, 400); // 0.4s clean fade duration
    } catch {
      // App.tsx handles error state
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitLogin();
  }

  async function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (!isLoginSubmitKey(event)) return;
    event.preventDefault();
    await submitLogin();
  }

  const renderedLoginImageIndexes = getRenderableLoginImageIndexes(
    loginImages.length,
    activeLoginImageIndex,
    loadedLoginImageIndexes,
    shouldRenderNextLoginImage,
  );

  return (
    <main className={`login-page${isAnimating ? ' professional-animating' : ''}`}>
      <div className="login-layout">
        <section className="login-visual" aria-hidden="true">
          {renderedLoginImageIndexes.map((imageIndex) => {
            const image = loginImages[imageIndex];
            const shouldEagerLoad = imageIndex === activeLoginImageIndex;

            return (
              <img
                key={`${image.src}-${imageIndex}`}
                className={getLoginImageClassName(
                  imageIndex,
                  activeLoginImageIndex,
                  lastLoadedIndex,
                  loadedLoginImageIndexes,
                )}
                src={image.src}
                style={{ objectPosition: image.objectPosition }}
                loading={shouldEagerLoad ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={imageIndex === activeLoginImageIndex ? 'high' : 'low'}
                onLoad={() => {
                  setLoadedLoginImageIndexes((current) => {
                    if (current.has(imageIndex)) return current;
                    const next = new Set(current);
                    next.add(imageIndex);
                    return next;
                  });
                  if (imageIndex === activeLoginImageIndex) {
                    setLastLoadedIndex(imageIndex);
                    setShouldRenderNextLoginImage(true);
                  }
                }}
                alt=""
              />
            );
          })}
        </section>

        <section className="login-form-column">
          <div className="login-panel" aria-labelledby="login-title">
            <div className="brand-lockup">
              <div>
                <h1 id="login-title">KMITL Nova</h1>
                <p>ระบบดึงข้อมูลการเรียน สจล.</p>
              </div>
            </div>

            <form className="login-form" onSubmit={handleSubmit} onKeyDown={(event) => void handleKeyDown(event)}>
              <label>
                <span>Student ID</span>
                <div className="field">
                  <UserRound size={18} />
                  <input
                    value={studentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    autoComplete="username"
                    inputMode="numeric"
                    required
                  />
                </div>
              </label>

              <label>
                <span>Password</span>
                <div className="field">
                  <LockKeyhole size={18} />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              {error ? <p className="form-error">{error}</p> : null}

              <button className="primary-button" type="submit" disabled={isLoading}>
                <LogIn size={18} />
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
              </button>
            </form>

            <p className="credential-note">
              ไม่มีการบันทึกรหัสผ่านลงไฟล์หรือฐานข้อมูลใดๆ
            </p>
          </div>
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
