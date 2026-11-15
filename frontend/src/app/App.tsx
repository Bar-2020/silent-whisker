import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Route, Routes } from 'react-router';
import { AuthCallbackPage, RequireSignIn } from '@features/auth';
import { LandingPage } from '@features/landing';
import { LegalLayout, PrivacyPage, TermsPage } from '@features/legal';
import { ProfilePage } from '@features/profile';
import { NotFoundPage } from './not-found-page/NotFoundPage';
import { AppShell } from './app-shell/AppShell';

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
        <Route index element={<LandingPage />} />
        <Route element={<LegalLayout />}>
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route element={<RequireSignIn />}>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
