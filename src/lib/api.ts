import { clearCsrfToken, getCsrfToken } from './csrf';
import { getApiUrl } from './api-url';

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public data: ApiError,
  ) {
    super(data.message);
    this.name = 'ApiRequestError';
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiRequestError(res.status, {
      message: data.error?.message ?? 'Request failed',
      code: data.error?.code,
      details: data.error?.details,
    });
  }

  return data as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = options;

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  return parseResponse<T>(res);
}

async function apiFetchWithCsrf<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const csrfToken = await getCsrfToken();
  const { headers, ...rest } = options;
  return apiFetch<T>(path, {
    ...rest,
    headers: { 'X-CSRF-Token': csrfToken, ...headers },
  });
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
  isPlatformAdmin?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; firstName: string; lastName: string };
}

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  emailVerified: boolean;
  organizationId: string;
  createdAt: string;
}

export const authApi = {
  register: (body: {
    organizationName: string;
    organizationSlug?: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) =>
    apiFetchWithCsrf<{ user: AuthUser; accessToken: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { organizationSlug: string; email: string; password: string }) =>
    apiFetchWithCsrf<{ user: AuthUser; accessToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: (accessToken: string) =>
    apiFetchWithCsrf<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      accessToken,
    }).finally(() => clearCsrfToken()),

  refresh: () => apiFetchWithCsrf<{ accessToken: string }>('/api/auth/refresh', { method: 'POST' }),

  me: (accessToken: string) => apiFetch<{ user: AuthUser }>('/api/auth/me', { accessToken }),

  forgotPassword: (body: { organizationSlug: string; email: string }) =>
    apiFetch<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  resetPassword: (body: { token: string; organizationSlug: string; password: string }) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const orgApi = {
  get: (accessToken: string) =>
    apiFetch<{ organization: Organization }>('/api/organizations/current', { accessToken }),

  update: (accessToken: string, body: Partial<Pick<Organization, 'name' | 'timezone' | 'currency' | 'theme'>>) =>
    apiFetch<{ organization: Organization }>('/api/organizations/current', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(body),
    }),

  uploadLogo: (accessToken: string, file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return apiFetch<{ organization: Organization }>('/api/organizations/current/logo', {
      method: 'POST',
      accessToken,
      body: form,
    });
  },
};

export const teamApi = {
  listMembers: (accessToken: string) =>
    apiFetch<{ members: TeamMember[] }>('/api/team/members', { accessToken }),

  listInvitations: (accessToken: string) =>
    apiFetch<{ invitations: Invitation[] }>('/api/team/invitations', { accessToken }),

  invite: (accessToken: string, body: { email: string; role: string }) =>
    apiFetch<{ invitation: Invitation }>('/api/team/invitations', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
    }),

  revokeInvitation: (accessToken: string, id: string) =>
    apiFetch<{ message: string }>(`/api/team/invitations/${id}`, {
      method: 'DELETE',
      accessToken,
    }),

  updateRole: (accessToken: string, userId: string, role: string) =>
    apiFetch<{ member: TeamMember }>(`/api/team/members/${userId}/role`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ role }),
    }),

  deactivate: (accessToken: string, userId: string) =>
    apiFetch<{ member: TeamMember }>(`/api/team/members/${userId}/deactivate`, {
      method: 'PATCH',
      accessToken,
    }),

  reactivate: (accessToken: string, userId: string) =>
    apiFetch<{ member: TeamMember }>(`/api/team/members/${userId}/reactivate`, {
      method: 'PATCH',
      accessToken,
    }),

  previewInvitation: (token: string) =>
    apiFetch<{
      invitation: {
        email: string;
        role: string;
        organizationName: string;
        organizationSlug: string;
        expiresAt: string;
        status: 'valid' | 'expired' | 'revoked' | 'accepted';
      };
    }>(`/api/team/invitations/preview?token=${encodeURIComponent(token)}`),

  acceptInvitation: (body: {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
  }) =>
    apiFetchWithCsrf<{ user: TeamMember; accessToken: string }>('/api/team/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const profileApi = {
  get: (accessToken: string) => apiFetch<{ profile: Profile }>('/api/profile', { accessToken }),

  update: (accessToken: string, body: { firstName?: string; lastName?: string; bio?: string | null }) =>
    apiFetch<{ profile: Profile }>('/api/profile', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(body),
    }),

  uploadAvatar: (accessToken: string, file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return apiFetch<{ profile: Profile }>('/api/profile/avatar', {
      method: 'POST',
      accessToken,
      body: form,
    });
  },

  changePassword: (accessToken: string, body: { currentPassword: string; newPassword: string }) =>
    apiFetch<{ message: string }>('/api/profile/change-password', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
    }),
};

export interface ProjectMember {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  _count?: { tasks: number };
}

export interface TaskAssignee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export interface Task {
  id: string;
  projectId: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  position: number;
  assigneeId: string | null;
  assignee: TaskAssignee | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
}

export interface CommentAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: TaskAssignee;
  attachments: CommentAttachment[];
  replies: TaskComment[];
}

export interface MentionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export const projectsApi = {
  list: (accessToken: string) =>
    apiFetch<{ projects: Project[] }>('/api/projects', { accessToken }),

  get: (accessToken: string, id: string) =>
    apiFetch<{ project: Project }>(`/api/projects/${id}`, { accessToken }),

  create: (
    accessToken: string,
    body: { name: string; description?: string; status?: string; memberIds?: string[] },
  ) =>
    apiFetch<{ project: Project }>('/api/projects', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
    }),

  update: (
    accessToken: string,
    id: string,
    body: { name?: string; description?: string | null; status?: string },
  ) =>
    apiFetch<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(body),
    }),

  delete: (accessToken: string, id: string) =>
    apiFetch<{ message: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
      accessToken,
    }),

  setMembers: (accessToken: string, id: string, memberIds: string[]) =>
    apiFetch<{ project: Project }>(`/api/projects/${id}/members`, {
      method: 'PUT',
      accessToken,
      body: JSON.stringify({ memberIds }),
    }),
};

export const tasksApi = {
  listByProject: (accessToken: string, projectId: string) =>
    apiFetch<{ tasks: Task[] }>(`/api/tasks/project/${projectId}`, { accessToken }),

  get: (accessToken: string, id: string) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}`, { accessToken }),

  create: (
    accessToken: string,
    projectId: string,
    body: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    },
  ) =>
    apiFetch<{ task: Task }>(`/api/tasks/project/${projectId}`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
    }),

  update: (
    accessToken: string,
    id: string,
    body: Partial<{
      title: string;
      description: string | null;
      status: string;
      priority: string;
      assigneeId: string | null;
      dueDate: string | null;
    }>,
  ) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(body),
    }),

  move: (accessToken: string, id: string, body: { status: string; position: number }) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}/move`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(body),
    }),

  delete: (accessToken: string, id: string) =>
    apiFetch<{ message: string }>(`/api/tasks/${id}`, {
      method: 'DELETE',
      accessToken,
    }),

  listComments: (accessToken: string, taskId: string) =>
    apiFetch<{ comments: TaskComment[] }>(`/api/tasks/${taskId}/comments`, { accessToken }),

  createComment: (
    accessToken: string,
    taskId: string,
    body: { body: string; parentId?: string | null },
    files?: File[],
  ) => {
    const form = new FormData();
    form.append('body', body.body);
    if (body.parentId) form.append('parentId', body.parentId);
    files?.forEach((f) => form.append('attachments', f));
    return apiFetch<{ comment: TaskComment }>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      accessToken,
      body: form,
    });
  },

  updateComment: (accessToken: string, id: string, body: string) =>
    apiFetch<{ comment: TaskComment }>(`/api/tasks/comments/${id}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ body }),
    }),

  deleteComment: (accessToken: string, id: string) =>
    apiFetch<{ message: string }>(`/api/tasks/comments/${id}`, {
      method: 'DELETE',
      accessToken,
    }),

  searchMentions: (accessToken: string, taskId: string, q: string) =>
    apiFetch<{ users: MentionUser[] }>(
      `/api/tasks/${taskId}/mentions?q=${encodeURIComponent(q)}`,
      { accessToken },
    ),
};

export interface ActivityLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  projectId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export const activityApi = {
  listOrg: (accessToken: string) =>
    apiFetch<{ activities: ActivityLog[] }>('/api/activity/org', { accessToken }),

  listProject: (accessToken: string, projectId: string) =>
    apiFetch<{ activities: ActivityLog[] }>(`/api/activity/project/${projectId}`, {
      accessToken,
    }),
};

export const notificationsApi = {
  list: (accessToken: string) =>
    apiFetch<{ notifications: Notification[] }>('/api/notifications', { accessToken }),

  unreadCount: (accessToken: string) =>
    apiFetch<{ count: number }>('/api/notifications/unread-count', { accessToken }),

  markRead: (accessToken: string, id: string) =>
    apiFetch<{ notification: Notification }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      accessToken,
    }),

  markAllRead: (accessToken: string) =>
    apiFetch<{ message: string }>('/api/notifications/read-all', {
      method: 'PATCH',
      accessToken,
    }),
};

export interface AnalyticsSummary {
  projects: { active: number; completed: number; delayed: number };
  tasksByStatus: Record<string, number>;
  tasksCompletedPerUser: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    count: number;
  }>;
  teamCompletionRate: number;
  totals: { projects: number; tasks: number; completedTasks: number };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: 'project' | 'task';
  projectId: string;
  taskId?: string;
  status?: string;
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  _count: { users: number; projects: number; tasks: number };
}

export const analyticsApi = {
  summary: (accessToken: string) =>
    apiFetch<{ summary: AnalyticsSummary }>('/api/analytics/summary', { accessToken }),
};

export const calendarApi = {
  events: (accessToken: string, start: string, end: string) =>
    apiFetch<{ events: CalendarEvent[] }>(
      `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { accessToken },
    ),
};

export const adminApi = {
  listOrganizations: (accessToken: string) =>
    apiFetch<{ organizations: AdminOrganization[] }>('/api/admin/organizations', { accessToken }),

  updateStatus: (accessToken: string, id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    apiFetch<{ organization: AdminOrganization }>(`/api/admin/organizations/${id}/status`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ status }),
    }),
};
