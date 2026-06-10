'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, ApiRequestError } from '@/lib/api';
import { setAccessToken } from '@/lib/auth-storage';
import auth from '@/components/auth/AuthLayout.module.css';
import ui from '@/components/ui/ui.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      const result = await authApi.register({
        organizationName: form.get('organizationName') as string,
        organizationSlug: (form.get('organizationSlug') as string) || undefined,
        email: form.get('email') as string,
        password: form.get('password') as string,
        firstName: form.get('firstName') as string,
        lastName: form.get('lastName') as string,
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
        <p className={auth.subtitle}>Create your organization workspace</p>

        {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}

        <form className={auth.form} onSubmit={handleSubmit}>
          <div className={ui.field}>
            <label className={ui.label}>Organization name</label>
            <input className={ui.input} name="organizationName" placeholder="Acme Corp" required />
          </div>
          <div className={ui.field}>
            <label className={ui.label}>Organization slug (optional)</label>
            <input className={ui.input} name="organizationSlug" placeholder="acme-corp" pattern="[a-z0-9-]+" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={ui.field}>
              <label className={ui.label}>First name</label>
              <input className={ui.input} name="firstName" required />
            </div>
            <div className={ui.field}>
              <label className={ui.label}>Last name</label>
              <input className={ui.input} name="lastName" required />
            </div>
          </div>
          <div className={ui.field}>
            <label className={ui.label}>Email</label>
            <input className={ui.input} name="email" type="email" required />
          </div>
          <div className={ui.field}>
            <label className={ui.label}>Password</label>
            <input className={ui.input} name="password" type="password" minLength={8} required />
          </div>
          <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Creating...' : 'Create workspace'}
          </button>
        </form>

        <div className={auth.footer}>
          Already have an account? <Link className={auth.link} href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
