import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      <main className={styles.main}>
        <div className={styles.badge}>Multi-tenant SaaS</div>
        <h1 className={styles.title}>
          Project management,
          <br />
          <span className={styles.gradient}>built for teams</span>
        </h1>
        <p className={styles.subtitle}>
          Orbit gives your organization a secure, isolated workspace with role-based access,
          team invitations, and powerful collaboration tools.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/register">
            Create workspace
          </Link>
          <Link className={styles.secondary} href="/login">
            Sign in
          </Link>
        </div>
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>◇</span>
            <span>Tenant isolation</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>◎</span>
            <span>5-role RBAC</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>○</span>
            <span>Team invitations</span>
          </div>
        </div>
      </main>
    </div>
  );
}
