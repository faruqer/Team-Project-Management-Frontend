'use client';

import { useEffect, useState, useCallback } from 'react';
import { activityApi, ActivityLog } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import ui from '@/components/ui/ui.module.css';
import styles from './activity.module.css';

const ACTION_LABELS: Record<string, string> = {
  TASK_CREATED: 'created a task',
  TASK_UPDATED: 'updated a task',
  TASK_DELETED: 'deleted a task',
  PROJECT_UPDATED: 'updated the project',
};

interface ActivityTimelineProps {
  token: string | null;
  scope: 'org' | 'project';
  projectId?: string;
}

export function ActivityTimeline({ token, scope, projectId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res =
        scope === 'project' && projectId
          ? await activityApi.listProject(token, projectId)
          : await activityApi.listOrg(token);
      setActivities(res.activities);
    } finally {
      setLoading(false);
    }
  }, [token, scope, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket(
    token,
    {
      onActivity: (data) => {
        const log = data as ActivityLog;
        if (scope === 'project' && log.projectId !== projectId) return;
        setActivities((prev) => {
          if (prev.some((a) => a.id === log.id)) return prev;
          return [log, ...prev];
        });
      },
    },
    projectId,
  );

  if (loading) {
    return <div className={styles.loading}>Loading activity...</div>;
  }

  return (
    <div className={`${ui.card} ${styles.timeline}`}>
      <div className={ui.cardTitle}>Activity</div>
      <div className={ui.cardDesc}>Recent events in {scope === 'org' ? 'your organization' : 'this project'}</div>

      {activities.length === 0 ? (
        <p className={styles.empty}>No activity yet</p>
      ) : (
        <ul className={styles.list}>
          {activities.map((a) => {
            const meta = a.metadata as { title?: string; name?: string } | null;
            const target = meta?.title ?? meta?.name ?? a.targetId.slice(0, 8);

            return (
              <li key={a.id} className={styles.item}>
                <div className={ui.avatar} style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                  {a.actor.avatarUrl ? (
                    <img src={a.actor.avatarUrl} alt="" />
                  ) : (
                    `${a.actor.firstName[0]}${a.actor.lastName[0]}`
                  )}
                </div>
                <div className={styles.content}>
                  <p className={styles.text}>
                    <strong>{a.actor.firstName} {a.actor.lastName}</strong>{' '}
                    {ACTION_LABELS[a.action] ?? a.action}{' '}
                    <span className={styles.target}>{target}</span>
                  </p>
                  <time className={styles.time}>
                    {new Date(a.createdAt).toLocaleString()}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
