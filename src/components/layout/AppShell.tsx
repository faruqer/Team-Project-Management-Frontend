'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ROLE_LABELS, UserRole } from '@/lib/roles';
import styles from './AppShell.module.css';
import ui from '@/components/ui/ui.module.css';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const BASE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/projects', label: 'Projects', icon: '▣' },
  { href: '/calendar', label: 'Calendar', icon: '▦' },
  { href: '/settings/organization', label: 'Organization', icon: '◇', section: 'Settings' },
  { href: '/settings/team', label: 'Team', icon: '◎' },
  { href: '/settings/profile', label: 'Profile', icon: '○' },
];

export function AppShell({ children, title, description }: AppShellProps) {
  const pathname = usePathname();
  const { user, token, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Loading...
      </div>
    );
  }

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const isPlatformAdmin = user.role === 'SUPER_ADMIN' && user.isPlatformAdmin;
  const navItems = isPlatformAdmin
    ? [
        ...BASE_NAV.slice(0, 3),
        { href: '/admin', label: 'Platform Admin', icon: '★', section: 'Admin' },
        ...BASE_NAV.slice(3),
      ]
    : BASE_NAV;
  let lastSection = '';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandName}>Orbit</div>
          <div className={styles.brandSub}>Workspace</div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;

            return (
              <div key={item.href}>
                {showSection && <div className={styles.navSection}>{item.section}</div>}
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${pathname === item.href ? styles.navLinkActive : ''}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className={styles.userPanel}>
          <div className={ui.avatar}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" />
            ) : (
              initials
            )}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {user.firstName} {user.lastName}
            </div>
            <div className={styles.userRole}>
              {ROLE_LABELS[user.role as UserRole] ?? user.role}
            </div>
          </div>
          <button className={`${ui.button} ${ui.ghost} ${ui.sm}`} onClick={logout}>
            Exit
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.headerTitle}>{title}</h1>
              {description && <p className={styles.headerDesc}>{description}</p>}
            </div>
            <NotificationBell token={token} />
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
