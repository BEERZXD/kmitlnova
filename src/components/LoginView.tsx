import { FormEvent, useState } from 'react';
import { LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { AppFooter } from './AppFooter';

const kmitlLogoUrl = 'https://www.kmitl.ac.th/themes/custom/kmitl/logo.svg';

type LoginViewProps = {
  error: string;
  isLoading: boolean;
  onSubmit: (studentId: string, password: string) => Promise<void>;
};

export function LoginView({ error, isLoading, onSubmit }: LoginViewProps) {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(studentId.trim(), password);
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-lockup">
          <img className="brand-mark" src={kmitlLogoUrl} alt="KMITL logo" />
          <div>
            <h1 id="login-title">KMITL Nova</h1>
            <p>ระบบดึงข้อมูลการเรียน สจล.</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
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
      </section>
      <AppFooter />
    </main>
  );
}
