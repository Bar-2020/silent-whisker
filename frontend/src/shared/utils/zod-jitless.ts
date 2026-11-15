import { z } from 'zod';

// zod probes `Function('')` to compile faster parsers, and the app's CSP (D-104) forbids eval, so every
// load logs a violation. Imported first in main.tsx: schemas read this when they are created.
z.config({ jitless: true });
