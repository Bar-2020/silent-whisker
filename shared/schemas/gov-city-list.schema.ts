import { z } from 'zod';

/** What `scripts/build-cities.ts` reads from the government's list of localities (data.gov.il, D-117): the fields it uses. */
export const govCityListSchema = z.object({
  result: z.object({
    records: z.array(
      z.object({
        symbol_number: z.number(),
        name_in_hebrew: z.string().nullable(),
        name_in_english: z.string().nullable(),
        name_in_arabic: z.string().nullable(),
        name_in_russian: z.string().nullable(),
      })
    ),
  }),
});
