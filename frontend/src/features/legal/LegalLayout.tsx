import { Outlet } from 'react-router';
import { TopBar } from '@shared/components/top-bar/TopBar';
import { LegalFooter } from './LegalFooter';

/** The public legal pages: the top bar, the text, a slate footer. No sign-in (R-22). */
export function LegalLayout() {
  return (
    <>
      <TopBar />
      <main>
        <Outlet />
      </main>
      <LegalFooter />
    </>
  );
}
