import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Route, Routes } from 'react-router';
import { AuthCallbackPage, RequireSignIn, SendMemberHome } from '@features/auth';
import { HomePage } from '@features/home';
import { LandingPage } from '@features/landing';
import { LegalLayout, PrivacyPage, TermsPage } from '@features/legal';
import {
  RequireFirstRunDone,
  InstallGuidePage,
  LocationHelpPage,
  ProfilePage,
  RequireAcceptedTerms,
} from '@features/profile';
import { NotFoundPage } from './not-found-page/NotFoundPage';
import { AppShell } from './app-shell/AppShell';
import {
  AUTH_CALLBACK_PATH,
  INSTALL_GUIDE_PATH,
  LOCATION_HELP_PATH,
  MEMBER_HOME_PATH,
  PRIVACY_PATH,
  PROFILE_PATH,
  TERMS_PATH,
} from '@constants/routes';

export function App() {
  // One cache per app, made fresh on each mount. The wait after a 429 is the screen's to show (D-60),
  // so nothing is retried or refetched by itself.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<SendMemberHome />}>
          <Route index element={<LandingPage />} />
        </Route>
        <Route element={<LegalLayout />}>
          <Route path={PRIVACY_PATH} element={<PrivacyPage />} />
          <Route path={TERMS_PATH} element={<TermsPage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route path={AUTH_CALLBACK_PATH} element={<AuthCallbackPage />} />
          <Route element={<RequireSignIn />}>
            <Route element={<RequireAcceptedTerms />}>
              <Route element={<RequireFirstRunDone />}>
                <Route path={MEMBER_HOME_PATH} element={<HomePage />} />
                <Route path={PROFILE_PATH} element={<ProfilePage />} />
                <Route path={INSTALL_GUIDE_PATH} element={<InstallGuidePage />} />
                <Route path={LOCATION_HELP_PATH} element={<LocationHelpPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
