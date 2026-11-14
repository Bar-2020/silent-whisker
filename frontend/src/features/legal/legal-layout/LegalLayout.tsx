import { Outlet } from 'react-router';
import { SiteFooter } from '@shared/components/site-footer/SiteFooter';
import { AppTopBar } from '@shared/components/app-top-bar/AppTopBar';

/** The public legal pages: the top bar, the text, a slate footer. No sign-in (R-22). */
export function LegalLayout() {
  return (
    <>
      <AppTopBar />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
