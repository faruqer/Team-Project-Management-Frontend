'use client';

import { FormEvent, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { teamApi, ApiRequestError } from '@/lib/api';
import { setAccessToken } from '@/lib/auth-storage';
import { ROLE_LABELS, UserRole } from '@/lib/roles';
import auth from '@/components/auth/AuthLayout.module.css';
import ui from '@/components/ui/ui.module.css';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [preview, setPreview] = useState<{
    email: string;
    role: string;
    organizationName: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoadingPreview(false);
      setError('Invalid invitation link');
      return;
    }

    teamApi
      .previewInvitation(token)
      .then((res) => setPreview(res.invitation))
      .catch(() => setError('Invitation not found'))
      .finally(() => setLoadingPreview(false));
  }, [token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      const result = await teamApi.acceptInvitation({
        token,
        firstName: form.get('firstName') as string,
        lastName: form.get('lastName') as string,
        password: form.get('password') as string,
      });
      setAccessToken(result.accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  }

  if (loadingPreview) {
    return (
      <div className={auth.page}>
        <div className={auth.card}>Loading invitation...</div>
      </div>
    );
  }

  if (!preview || preview.status !== 'valid') {
    const messages: Record<string, string> = {
      expired: 'This invitation has expired. Ask your admin to send a new one.',
      revoked: 'This invitation has been revoked.',
      accepted: 'This invitation has already been accepted.',
    };

    return (
      <div className={auth.page}>
        <div className={auth.card}>
          <div className={auth.logo}>Orbit</div>
          <p className={auth.subtitle}>
            {preview ? messages[preview.status] : error || 'Invalid invitation'}
          </p>
          <div className={auth.footer}>
            <Link className={auth.link} href="/login">Go to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={auth.page}>
      <div className={auth.card}>
        <div className={auth.logo}>Orbit</div>
        <p className={auth.subtitle}>
          Join <strong>{preview.organizationName}</strong> as{' '}
          <strong>{ROLE_LABELS[preview.role as UserRole]}</strong>
        </p>

        {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}

        <form className={auth.form} onSubmit={handleSubmit}>
          <div className={ui.field}>
            <label className={ui.label}>Email</label>
            <input className={ui.input} value={preview.email} disabled />
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
            <label className={ui.label}>Password</label>
            <input className={ui.input} name="password" type="password" minLength={8} required />
          </div>
          <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Joining...' : 'Accept & join'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
