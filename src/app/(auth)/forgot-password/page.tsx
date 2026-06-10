'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { authApi, ApiRequestError } from '@/lib/api';
import auth from '@/components/auth/AuthLayout.module.css';
import ui from '@/components/ui/ui.module.css';

export default function ForgotPasswordPage() {
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
      const result = await authApi.forgotPassword({
        organizationSlug: form.get('organizationSlug') as string,
        email: form.get('email') as string,
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
        <p className={auth.subtitle}>Reset your password</p>

        {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}
        {success && <div className={`${ui.alert} ${ui.alertSuccess}`}>{success}</div>}

        <form className={auth.form} onSubmit={handleSubmit}>
          <div className={ui.field}>
            <label className={ui.label}>Organization slug</label>
            <input className={ui.input} name="organizationSlug" required />
          </div>
          <div className={ui.field}>
            <label className={ui.label}>Email</label>
            <input className={ui.input} name="email" type="email" required />
          </div>
          <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className={auth.footer}>
          <Link className={auth.link} href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
