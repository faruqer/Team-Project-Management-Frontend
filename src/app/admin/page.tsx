'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { adminApi, AdminOrganization, ApiRequestError } from '@/lib/api';
import ui from '@/components/ui/ui.module.css';
import styles from './admin.module.css';

export default function AdminPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const canAccess = user?.role === 'SUPER_ADMIN' && user?.isPlatformAdmin;

  const load = useCallback(async () => {
    if (!token || !canAccess) return;
    setLoading(true);
    try {
      const res = await adminApi.listOrganizations(token);
      setOrgs(res.organizations);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [token, canAccess]);

  useEffect(() => {
    if (user && !canAccess) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [user, canAccess, load, router]);

  async function toggleStatus(org: AdminOrganization) {
    if (!token) return;
    const next = org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const action = next === 'SUSPENDED' ? 'suspend' : 'unsuspend';
    if (!confirm(`${action} organization "${org.name}"?`)) return;

    try {
      await adminApi.updateStatus(token, org.id, next);
      setOrgs((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, status: next } : o)),
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to update status');
    }
  }

  if (!user || !canAccess) return null;

  return (
    <AppShell title="Platform Admin" description="Manage all organizations">
      {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}

      <div className={`${ui.card} ${styles.tableCard}`}>
        <div className={ui.cardTitle}>Organizations</div>
        <div className={ui.cardDesc}>View status and suspend or unsuspend tenants</div>

        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Users</th>
                <th>Projects</th>
                <th>Tasks</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td className={styles.muted}>{org.slug}</td>
                  <td>
                    <span
                      className={`${ui.badge} ${
                        org.status === 'ACTIVE' ? ui.badgeAccent : ui.badgeWarning
                      }`}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td>{org._count.users}</td>
                  <td>{org._count.projects}</td>
                  <td>{org._count.tasks}</td>
                  <td className={styles.muted}>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className={`${ui.button} ${org.status === 'ACTIVE' ? ui.danger : ui.primary} ${ui.sm}`}
                      onClick={() => toggleStatus(org)}
                    >
                      {org.status === 'ACTIVE' ? 'Suspend' : 'Unsuspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
