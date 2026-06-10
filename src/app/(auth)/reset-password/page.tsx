'use client';

import { FormEvent, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi, ApiRequestError } from '@/lib/api';
import auth from '@/components/auth/AuthLayout.module.css';
import ui from '@/components/ui/ui.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const org = searchParams.get('org') ?? '';

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      const result = await authApi.resetPassword({
        token: (form.get('token') as string) || token,
        organizationSlug: (form.get('organizationSlug') as string) || org,
        password: form.get('password') as string,
      });
      setSuccess(result.message);
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
        <p className={auth.subtitle}>Choose a new password</p>

        {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}
        {success && <div className={`${ui.alert} ${ui.alertSuccess}`}>{success}</div>}

        <form className={auth.form} onSubmit={handleSubmit}>
          {!token && (
            <div className={ui.field}>
              <label className={ui.label}>Reset token</label>
              <input className={ui.input} name="token" required />
            </div>
          )}
          {!org && (
            <div className={ui.field}>
              <label className={ui.label}>Organization slug</label>
              <input className={ui.input} name="organizationSlug" required />
            </div>
          )}
          <div className={ui.field}>
            <label className={ui.label}>New password</label>
            <input className={ui.input} name="password" type="password" minLength={8} required />
          </div>
          <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        <div className={auth.footer}>
          <Link className={auth.link} href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
