'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { teamApi, TeamMember, Invitation, ApiRequestError } from '@/lib/api';
import { can, INVITEABLE_ROLES, ROLE_LABELS, UserRole } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './team.module.css';

export default function TeamPage() {
  const { user, token } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviting, setInviting] = useState(false);

  const canInvite = user ? can(user.role, 'team:invite') : false;
  const canManage = user ? can(user.role, 'team:manage') : false;
  const canDeactivate = user ? can(user.role, 'team:deactivate') : false;

  const load = useCallback(async () => {
    if (!token) return;
    const [membersRes, invitesRes] = await Promise.all([
      teamApi.listMembers(token),
      canInvite ? teamApi.listInvitations(token).catch(() => ({ invitations: [] })) : Promise.resolve({ invitations: [] }),
    ]);
    setMembers(membersRes.members);
    setInvitations(invitesRes.invitations);
  }, [token, canInvite]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setError('');
    setSuccess('');
    setInviting(true);

    const form = new FormData(e.currentTarget);

    try {
      await teamApi.invite(token, {
        email: form.get('email') as string,
        role: form.get('role') as string,
      });
      setSuccess('Invitation sent');
      e.currentTarget.reset();
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!token) return;
    try {
      await teamApi.revokeInvitation(token, id);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to revoke');
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    if (!token) return;
    try {
      await teamApi.updateRole(token, userId, role);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to update role');
    }
  }

  async function handleDeactivate(userId: string) {
    if (!token) return;
    try {
      await teamApi.deactivate(token, userId);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to deactivate');
    }
  }

  async function handleReactivate(userId: string) {
    if (!token) return;
    try {
      await teamApi.reactivate(token, userId);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to reactivate');
    }
  }

  return (
    <AppShell title="Team" description="Manage members and invitations">
      {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}
      {success && <div className={`${ui.alert} ${ui.alertSuccess}`}>{success}</div>}

      {canInvite && (
        <form className={`${ui.card} ${styles.inviteCard}`} onSubmit={handleInvite}>
          <div className={ui.cardTitle}>Invite member</div>
          <div className={ui.cardDesc}>Send an email invitation with a role</div>
          <div className={styles.inviteRow}>
            <div className={ui.field} style={{ flex: 2 }}>
              <label className={ui.label}>Email</label>
              <input className={ui.input} name="email" type="email" placeholder="colleague@company.com" required />
            </div>
            <div className={ui.field} style={{ flex: 1 }}>
              <label className={ui.label}>Role</label>
              <select className={ui.select} name="role" defaultValue="TEAM_MEMBER">
                {INVITEABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={inviting} style={{ alignSelf: 'end' }}>
              {inviting ? 'Sending...' : 'Invite'}
            </button>
          </div>
        </form>
      )}

      {invitations.length > 0 && (
        <div className={`${ui.card} ${styles.section}`}>
          <div className={ui.cardTitle}>Pending invitations</div>
          <ul className={styles.list}>
            {invitations.map((inv) => (
              <li key={inv.id} className={styles.listItem}>
                <div>
                  <div className={styles.itemName}>{inv.email}</div>
                  <div className={styles.itemMeta}>
                    {ROLE_LABELS[inv.role as UserRole]} · expires{' '}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className={`${ui.button} ${ui.ghost} ${ui.sm}`}
                  onClick={() => handleRevoke(inv.id)}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`${ui.card} ${styles.section}`}>
        <div className={ui.cardTitle}>Members ({members.length})</div>
        <ul className={styles.list}>
          {members.map((member) => (
            <li key={member.id} className={styles.listItem}>
              <div className={styles.memberInfo}>
                <div className={ui.avatar}>
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" />
                  ) : (
                    `${member.firstName[0]}${member.lastName[0]}`
                  )}
                </div>
                <div>
                  <div className={styles.itemName}>
                    {member.firstName} {member.lastName}
                    {!member.isActive && (
                      <span className={`${ui.badge} ${ui.badgeDanger}`} style={{ marginLeft: '0.5rem' }}>
                        Deactivated
                      </span>
                    )}
                  </div>
                  <div className={styles.itemMeta}>{member.email}</div>
                </div>
              </div>

              <div className={styles.memberActions}>
                {canManage && member.id !== user?.id && member.role !== 'SUPER_ADMIN' ? (
                  <select
                    className={`${ui.select} ${styles.roleSelect}`}
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    disabled={!member.isActive}
                  >
                    {INVITEABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`${ui.badge} ${ui.badgeAccent}`}>
                    {ROLE_LABELS[member.role as UserRole] ?? member.role}
                  </span>
                )}

                {canDeactivate && member.id !== user?.id && member.role !== 'SUPER_ADMIN' && (
                  member.isActive ? (
                    <button
                      className={`${ui.button} ${ui.danger} ${ui.sm}`}
                      onClick={() => handleDeactivate(member.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className={`${ui.button} ${ui.secondary} ${ui.sm}`}
                      onClick={() => handleReactivate(member.id)}
                    >
                      Reactivate
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
