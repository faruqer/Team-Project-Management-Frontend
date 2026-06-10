'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { orgApi, Organization, ApiRequestError } from '@/lib/api';
import { can } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './organization.module.css';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Australia/Sydney',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];

export default function OrganizationSettingsPage() {
  const { user, token } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);

  const canEdit = user ? can(user.role, 'org:update') : false;

  useEffect(() => {
    if (!token) return;
    orgApi.get(token).then((res) => setOrg(res.organization));
  }, [token]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !canEdit) return;

    setError('');
    setSuccess('');
    setSaving(true);

    const form = new FormData(e.currentTarget);

    try {
      const res = await orgApi.update(token, {
        name: form.get('name') as string,
        timezone: form.get('timezone') as string,
        currency: form.get('currency') as string,
        theme: form.get('theme') as Organization['theme'],
      });
      setOrg(res.organization);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    if (!token || !canEdit) return;

    setError('');
    setSuccess('');

    try {
      const res = await orgApi.uploadLogo(token, file);
      setOrg(res.organization);
      setSuccess('Logo updated');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to upload logo');
    }
  }

  if (!org) {
    return (
      <AppShell title="Organization" description="Workspace settings">
        <div className={styles.loading}>Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Organization" description="Manage your workspace settings">
      {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}
      {success && <div className={`${ui.alert} ${ui.alertSuccess}`}>{success}</div>}

      <div className={styles.layout}>
        <div className={ui.card}>
          <div className={ui.cardTitle}>Logo</div>
          <div className={ui.cardDesc}>Your organization&apos;s brand image</div>

          <div className={styles.logoSection}>
            <div className={styles.logoPreview}>
              {org.logoUrl ? (
                <img src={org.logoUrl} alt="Organization logo" />
              ) : (
                <span>{org.name[0]}</span>
              )}
            </div>
            {canEdit && (
              <>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
                <button
                  className={`${ui.button} ${ui.secondary}`}
                  onClick={() => logoRef.current?.click()}
                >
                  Upload logo
                </button>
              </>
            )}
          </div>
        </div>

        <form className={ui.card} onSubmit={handleSave}>
          <div className={ui.cardTitle}>General Settings</div>
          <div className={ui.cardDesc}>Configure your workspace preferences</div>

          <div className={styles.formGrid}>
            <div className={ui.field}>
              <label className={ui.label}>Organization name</label>
              <input
                className={ui.input}
                name="name"
                defaultValue={org.name}
                disabled={!canEdit}
                required
              />
            </div>

            <div className={ui.field}>
              <label className={ui.label}>Slug</label>
              <input className={ui.input} value={org.slug} disabled />
            </div>

            <div className={ui.field}>
              <label className={ui.label}>Timezone</label>
              <select
                className={ui.select}
                name="timezone"
                defaultValue={org.timezone}
                disabled={!canEdit}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className={ui.field}>
              <label className={ui.label}>Currency</label>
              <select
                className={ui.select}
                name="currency"
                defaultValue={org.currency}
                disabled={!canEdit}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={ui.field}>
              <label className={ui.label}>Theme</label>
              <select
                className={ui.select}
                name="theme"
                defaultValue={org.theme}
                disabled={!canEdit}
              >
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>
          </div>

          {canEdit && (
            <button
              className={`${ui.button} ${ui.primary}`}
              type="submit"
              disabled={saving}
              style={{ marginTop: '1.25rem' }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </form>

        <ActivityTimeline token={token} scope="org" />
      </div>
    </AppShell>
  );
}
