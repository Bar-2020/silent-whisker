import { Route, Routes } from 'react-router';
import { AuthCallbackPage } from '@features/auth';
import { LandingPage } from '@features/landing';
import { ProfilePage } from '@features/profile';
import { NotFoundPage } from './NotFoundPage';
import { Shell } from './Shell';

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<LandingPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
