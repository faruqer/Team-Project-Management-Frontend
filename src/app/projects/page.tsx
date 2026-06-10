'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { projectsApi, teamApi, Project, ApiRequestError } from '@/lib/api';
import { PROJECT_STATUS_LABELS, can } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './projects.module.css';

export default function ProjectsPage() {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    projectsApi.list(token).then((r) => setProjects(r.projects));
    teamApi.listMembers(token).then((r) =>
      setAllMembers(
        r.members
          .filter((m) => m.isActive)
          .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })),
      ),
    );
  }, [token]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setCreating(true);
    setError('');

    const form = new FormData(e.currentTarget);

    try {
      const { project } = await projectsApi.create(token, {
        name: form.get('name') as string,
        description: (form.get('description') as string) || undefined,
        status: (form.get('status') as string) || 'PLANNING',
        memberIds: memberIds.length > 0 ? memberIds : undefined,
      });
      setProjects((prev) => [project, ...prev]);
      setShowCreate(false);
      e.currentTarget.reset();
      setMemberIds([]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  const canCreate = user ? can(user.role, 'project:create') : false;

  return (
    <AppShell title="Projects" description="Manage your organization's projects">
      {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}

      <div className={styles.toolbar}>
        {canCreate && (
          <button
            className={`${ui.button} ${ui.primary}`}
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? 'Cancel' : '+ New project'}
          </button>
        )}
      </div>

      {showCreate && (
        <form className={`${ui.card} ${styles.createForm}`} onSubmit={handleCreate}>
          <div className={ui.cardTitle}>Create project</div>
          <div className={styles.formGrid}>
            <div className={ui.field}>
              <label className={ui.label}>Name</label>
              <input className={ui.input} name="name" required />
            </div>
            <div className={ui.field}>
              <label className={ui.label}>Status</label>
              <select className={ui.select} name="status" defaultValue="PLANNING">
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className={ui.field} style={{ gridColumn: '1 / -1' }}>
              <label className={ui.label}>Description</label>
              <textarea className={ui.textarea} name="description" />
            </div>
            <div className={ui.field} style={{ gridColumn: '1 / -1' }}>
              <label className={ui.label}>Team members</label>
              <div className={styles.memberPicker}>
                {allMembers.map((m) => (
                  <label key={m.id} className={styles.memberChip}>
                    <input
                      type="checkbox"
                      checked={memberIds.includes(m.id)}
                      onChange={(e) => {
                        setMemberIds((prev) =>
                          e.target.checked
                            ? [...prev, m.id]
                            : prev.filter((id) => id !== m.id),
                        );
                      }}
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={creating} style={{ marginTop: '1rem' }}>
            {creating ? 'Creating...' : 'Create project'}
          </button>
        </form>
      )}

      <div className={styles.grid}>
        {projects.length === 0 ? (
          <p className={styles.empty}>No projects yet. Create one to get started.</p>
        ) : (
          projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className={styles.projectCard}>
              <div className={styles.projectHeader}>
                <h3>{project.name}</h3>
                <span className={`${ui.badge} ${ui.badgeAccent}`}>
                  {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                </span>
              </div>
              {project.description && (
                <p className={styles.projectDesc}>{project.description}</p>
              )}
              <div className={styles.projectMeta}>
                <span>{project._count?.tasks ?? 0} tasks</span>
                <span>{project.members?.length ?? 0} members</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
