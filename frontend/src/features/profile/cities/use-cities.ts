import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from '@constants/languages';
import { languageSchema } from '@shared/i18n/language.schema';
import { cityNamesSchema } from './city-names.schema';
import type { CityName } from './city-names.schema';

// One small file per language, loaded the first time a screen needs it; each is a chunk of its own (D-117).
const loaders = import.meta.glob<{ default: unknown }>('./names/*.json');

async function loadNames(language: string): Promise<CityName[]> {
  const { default: names } = await loaders[`./names/${language}.json`]();
  return cityNamesSchema.parse(names).map(([id, name, english, known]) => ({
    id,
    name,
    english,
    isKnown: known === 1,
  }));
}

/** The places, named in the language the app is showing; only that language's file is loaded. */
export function useCities() {
  const { i18n } = useTranslation();
  const language = languageSchema.catch(DEFAULT_LANGUAGE).parse(i18n.language);
  return useQuery({
    queryKey: ['cities', language],
    queryFn: () => loadNames(language),
    staleTime: Infinity,
  });
}
