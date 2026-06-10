'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { profileApi, Profile, ApiRequestError } from '@/lib/api';
import { ROLE_LABELS, UserRole } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user, token, refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    profileApi.get(token).then((res) => setProfile(res.profile));
  }, [token]);

  async function handleProfileSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setError('');
    setSuccess('');
    setSaving(true);

    const form = new FormData(e.currentTarget);

    try {
      const res = await profileApi.update(token, {
        firstName: form.get('firstName') as string,
        lastName: form.get('lastName') as string,
        bio: (form.get('bio') as string) || null,
      });
      setProfile(res.profile);
      setSuccess('Profile updated');
      refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setError('');
    setSuccess('');
    setChangingPassword(true);

    const form = new FormData(e.currentTarget);

    try {
      await profileApi.changePassword(token, {
        currentPassword: form.get('currentPassword') as string,
        newPassword: form.get('newPassword') as string,
      });
      setSuccess('Password changed successfully');
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!token) return;

    try {
      const res = await profileApi.uploadAvatar(token, file);
      setProfile(res.profile);
      setSuccess('Avatar updated');
      refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to upload avatar');
    }
  }

  if (!profile) {
    return (
      <AppShell title="Profile" description="Your personal settings">
        <div className={styles.loading}>Loading...</div>
      </AppShell>
    );
  }

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();

  return (
    <AppShell title="Profile" description="Your personal settings">
      {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}
      {success && <div className={`${ui.alert} ${ui.alertSuccess}`}>{success}</div>}

      <div className={styles.layout}>
        <div className={ui.card}>
          <div className={styles.avatarSection}>
            <div className={`${ui.avatar} ${ui.avatarLg}`}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" />
              ) : (
                initials
              )}
            </div>
            <div>
              <div className={styles.name}>
                {profile.firstName} {profile.lastName}
              </div>
              <div className={styles.email}>{profile.email}</div>
              <span className={`${ui.badge} ${ui.badgeAccent}`}>
                {ROLE_LABELS[profile.role as UserRole] ?? profile.role}
              </span>
            </div>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
            <button
              className={`${ui.button} ${ui.secondary}`}
              onClick={() => avatarRef.current?.click()}
            >
              Change avatar
            </button>
          </div>
        </div>

        <form className={ui.card} onSubmit={handleProfileSave}>
          <div className={ui.cardTitle}>Personal information</div>
          <div className={styles.formGrid}>
            <div className={ui.field}>
              <label className={ui.label}>First name</label>
              <input className={ui.input} name="firstName" defaultValue={profile.firstName} required />
            </div>
            <div className={ui.field}>
              <label className={ui.label}>Last name</label>
              <input className={ui.input} name="lastName" defaultValue={profile.lastName} required />
            </div>
            <div className={ui.field} style={{ gridColumn: '1 / -1' }}>
              <label className={ui.label}>Bio</label>
              <textarea className={ui.textarea} name="bio" defaultValue={profile.bio ?? ''} maxLength={500} placeholder="Tell your team about yourself..." />
            </div>
          </div>
          <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={saving} style={{ marginTop: '1.25rem' }}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>

        <form className={ui.card} onSubmit={handlePasswordChange}>
          <div className={ui.cardTitle}>Change password</div>
          <div className={ui.cardDesc}>Update your account password</div>
          <div className={styles.formGrid}>
            <div className={ui.field}>
              <label className={ui.label}>Current password</label>
              <input className={ui.input} name="currentPassword" type="password" required />
            </div>
            <div className={ui.field}>
              <label className={ui.label}>New password</label>
              <input className={ui.input} name="newPassword" type="password" minLength={8} required />
            </div>
          </div>
          <button
            className={`${ui.button} ${ui.secondary}`}
            type="submit"
            disabled={changingPassword}
            style={{ marginTop: '1.25rem' }}
          >
            {changingPassword ? 'Changing...' : 'Change password'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
