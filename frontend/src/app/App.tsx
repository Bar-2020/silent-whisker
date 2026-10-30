import { Route, Routes } from 'react-router';
import { AuthCallbackPage } from '@features/auth';
import { LandingPage } from '@features/landing';
import { LegalLayout, PrivacyPage, TermsPage } from '@features/legal';
import { ProfilePage } from '@features/profile';
import { NotFoundPage } from './NotFoundPage';
import { Shell } from './Shell';

export function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route element={<LegalLayout />}>
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
      </Route>
      <Route element={<Shell />}>
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
