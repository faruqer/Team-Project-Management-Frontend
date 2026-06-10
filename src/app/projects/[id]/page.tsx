'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { TaskModal } from '@/components/tasks/TaskModal';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import {
  projectsApi,
  tasksApi,
  teamApi,
  Project,
  Task,
  TeamMember,
  ApiRequestError,
} from '@/lib/api';
import { PROJECT_STATUS_LABELS, can } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './project.module.css';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, token } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [projRes, tasksRes, membersRes] = await Promise.all([
      projectsApi.get(token, projectId),
      tasksApi.listByProject(token, projectId),
      teamApi.listMembers(token),
    ]);
    setProject(projRes.project);
    setTasks(tasksRes.tasks);
    setMembers(membersRes.members);
    setMemberIds(projRes.project.members?.map((m) => m.userId) ?? []);
  }, [token, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket(
    token,
    {
      onTaskCreated: () => load(),
      onTaskUpdated: () => load(),
      onTaskDeleted: (data) => {
        const { taskId } = data as { taskId: string };
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      },
    },
    projectId,
  );

  async function handleSaveMembers() {
    if (!token) return;
    try {
      const { project: updated } = await projectsApi.setMembers(token, projectId, memberIds);
      setProject(updated);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to update members');
    }
  }

  async function handleUpdateProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    try {
      const { project: updated } = await projectsApi.update(token, projectId, {
        name: form.get('name') as string,
        description: (form.get('description') as string) || null,
        status: form.get('status') as string,
      });
      setProject(updated);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to update project');
    }
  }

  async function handleDeleteProject() {
    if (!token || !confirm('Delete this project and all its tasks?')) return;
    try {
      await projectsApi.delete(token, projectId);
      window.location.href = '/projects';
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to delete project');
    }
  }

  if (!project) {
    return (
      <AppShell title="Project" description="Loading...">
        <div className={styles.loading}>Loading project...</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={project.name}
      description={project.description ?? 'Kanban board'}
    >
      {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}

      <div className={styles.toolbar}>
        <Link href="/projects" className={`${ui.button} ${ui.ghost} ${ui.sm}`}>
          ← Projects
        </Link>
        <span className={`${ui.badge} ${ui.badgeAccent}`}>
          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
        </span>
        {user && can(user.role, 'project:manage_members') && (
          <button
            className={`${ui.button} ${ui.secondary} ${ui.sm}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            Manage members
          </button>
        )}
      </div>

      {showSettings && (
        <div className={styles.settingsGrid}>
          {user && can(user.role, 'project:update') && (
            <form className={ui.card} onSubmit={handleUpdateProject}>
              <div className={ui.cardTitle}>Project settings</div>
              <div className={ui.field}>
                <label className={ui.label}>Name</label>
                <input className={ui.input} name="name" defaultValue={project.name} required />
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Status</label>
                <select className={ui.select} name="status" defaultValue={project.status}>
                  {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Description</label>
                <textarea className={ui.textarea} name="description" defaultValue={project.description ?? ''} />
              </div>
              <button className={`${ui.button} ${ui.primary} ${ui.sm}`} type="submit" style={{ marginTop: '0.75rem' }}>
                Save project
              </button>
            </form>
          )}
          {user && can(user.role, 'project:manage_members') && (
            <div className={ui.card}>
              <div className={ui.cardTitle}>Project members</div>
              <div className={styles.memberPicker}>
                {members
                  .filter((m) => m.isActive)
                  .map((m) => (
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
                      {m.firstName} {m.lastName}
                    </label>
                  ))}
              </div>
              <button className={`${ui.button} ${ui.primary} ${ui.sm}`} onClick={handleSaveMembers} style={{ marginTop: '0.75rem' }}>
                Save members
              </button>
            </div>
          )}
          {user && can(user.role, 'project:delete') && (
            <div className={ui.card}>
              <div className={ui.cardTitle}>Danger zone</div>
              <button className={`${ui.button} ${ui.danger}`} onClick={handleDeleteProject}>
                Delete project
              </button>
            </div>
          )}
        </div>
      )}

      <KanbanBoard
        tasks={tasks}
        token={token!}
        onTasksChange={setTasks}
        onTaskClick={setSelectedTask}
        onAddTask={(status) => setCreateStatus(status)}
      />

      <ActivityTimeline token={token} scope="project" projectId={projectId} />

      {(selectedTask || createStatus) && user && token && (
        <TaskModal
          task={selectedTask}
          token={token}
          members={members}
          userRole={user.role}
          userId={user.id}
          projectId={projectId}
          initialStatus={createStatus ?? undefined}
          isCreate={!!createStatus}
          onClose={() => {
            setSelectedTask(null);
            setCreateStatus(null);
          }}
          onUpdate={(task) => {
            if (createStatus) {
              setTasks((prev) => [...prev, task]);
            } else {
              setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            }
            setSelectedTask(null);
            setCreateStatus(null);
          }}
          onDelete={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id));
          }}
        />
      )}
    </AppShell>
  );
}
