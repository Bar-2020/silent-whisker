import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from '@app/App';
import { LoadFailedScreen } from '@app/LoadFailedScreen';
import { initI18n } from '@shared/i18n/i18n';
import '@styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html has no #root element');
const root = createRoot(rootElement);

try {
  await initI18n();
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
} catch {
  root.render(<LoadFailedScreen />);
}
