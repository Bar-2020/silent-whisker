import { z } from 'zod';

/** A locale file is flat: a key like `nav.home` to its text (D-32). */
export const localeSchema = z.record(z.string(), z.string());
