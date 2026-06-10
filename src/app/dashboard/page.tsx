'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { useAuth } from '@/hooks/useAuth';
import { analyticsApi, orgApi, teamApi, AnalyticsSummary, Organization } from '@/lib/api';
import { ROLE_LABELS, UserRole } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      orgApi.get(token),
      teamApi.listMembers(token),
      analyticsApi.summary(token),
    ]).then(([orgRes, teamRes, analyticsRes]) => {
      setOrg(orgRes.organization);
      setMemberCount(teamRes.members.filter((m) => m.isActive).length);
      setSummary(analyticsRes.summary);
    });
  }, [token]);

  return (
    <AppShell title="Dashboard" description="Analytics and workspace overview">
      <div className={styles.grid}>
        <div className={`${ui.card} ${styles.welcome}`}>
          <h2 className={styles.welcomeTitle}>Welcome back, {user?.firstName}</h2>
          <p className={styles.welcomeText}>
            Track project health, task progress, and team performance.
          </p>
          {!user?.emailVerified && (
            <span className={`${ui.badge} ${ui.badgeWarning}`}>Email not verified</span>
          )}
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>Organization</div>
          <div className={ui.cardDesc}>Current workspace</div>
          <div className={styles.statValue}>{org?.name ?? '—'}</div>
          <div className={styles.statMeta}>{org?.slug}</div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>Team Members</div>
          <div className={ui.cardDesc}>Active members in your org</div>
          <div className={styles.statValue}>{memberCount}</div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>Your Role</div>
          <div className={ui.cardDesc}>Permissions level</div>
          <div className={styles.statValue}>
            {user ? ROLE_LABELS[user.role as UserRole] ?? user.role : '—'}
          </div>
        </div>
      </div>

      {summary && <DashboardCharts summary={summary} />}
    </AppShell>
  );
}
