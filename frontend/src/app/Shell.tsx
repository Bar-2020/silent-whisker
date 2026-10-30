import { Outlet } from 'react-router';
import { TopBar } from '@shared/components/top-bar/TopBar';
import styles from './Shell.module.css';

export function Shell() {
  return (
    <>
      <TopBar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
