import { Outlet } from 'react-router';
import { AppTopBar } from '@shared/components/app-top-bar/AppTopBar';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <>
      <AppTopBar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
