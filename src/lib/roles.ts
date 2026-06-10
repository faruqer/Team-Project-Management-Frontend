export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORGANIZATION_ADMIN'
  | 'PROJECT_MANAGER'
  | 'TEAM_MEMBER'
  | 'CLIENT';

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORGANIZATION_ADMIN: 'Organization Admin',
  PROJECT_MANAGER: 'Project Manager',
  TEAM_MEMBER: 'Team Member',
  CLIENT: 'Client',
};

export const INVITEABLE_ROLES: UserRole[] = [
  'ORGANIZATION_ADMIN',
  'PROJECT_MANAGER',
  'TEAM_MEMBER',
  'CLIENT',
];

const PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    'org:update', 'team:invite', 'team:manage', 'team:deactivate',
    'project:create', 'project:update', 'project:delete', 'project:manage_members',
    'task:create', 'task:update', 'task:delete',
  ],
  ORGANIZATION_ADMIN: [
    'org:update', 'team:invite', 'team:manage', 'team:deactivate',
    'project:create', 'project:update', 'project:delete', 'project:manage_members',
    'task:create', 'task:update', 'task:delete',
  ],
  PROJECT_MANAGER: [
    'team:invite', 'project:create', 'project:update', 'project:manage_members',
    'task:create', 'task:update', 'task:delete',
  ],
  TEAM_MEMBER: ['task:create', 'task:update'],
  CLIENT: [],
};

export function can(role: string, permission: string): boolean {
  return PERMISSIONS[role as UserRole]?.includes(permission) ?? false;
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const KANBAN_COLUMNS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
