'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, ApiRequestError } from '@/lib/api';
import { setAccessToken } from '@/lib/auth-storage';
import auth from '@/components/auth/AuthLayout.module.css';
import ui from '@/components/ui/ui.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      const result = await authApi.login({
        organizationSlug: form.get('organizationSlug') as string,
        email: form.get('email') as string,
        password: form.get('password') as string,
      });
      setAccessToken(result.accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={auth.page}>
      <div className={auth.card}>
        <div className={auth.logo}>Orbit</div>
        <p className={auth.subtitle}>Sign in to your workspace</p>

        {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}

        <form className={auth.form} onSubmit={handleSubmit}>
          <div className={ui.field}>
            <label className={ui.label}>Organization slug</label>
            <input className={ui.input} name="organizationSlug" placeholder="acme-corp" required />
          </div>
          <div className={ui.field}>
            <label className={ui.label}>Email</label>
            <input className={ui.input} name="email" type="email" placeholder="you@company.com" required />
          </div>
          <div className={ui.field}>
            <label className={ui.label}>Password</label>
            <input className={ui.input} name="password" type="password" required />
          </div>
          <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className={auth.footer}>
          <Link className={auth.link} href="/forgot-password">Forgot password?</Link>
          <br />
          <span style={{ marginTop: '0.5rem', display: 'inline-block' }}>
            No account? <Link className={auth.link} href="/register">Create workspace</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
