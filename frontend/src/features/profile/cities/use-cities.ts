import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CITY_FILES_PATH } from '@constants/cities';
import { DEFAULT_LANGUAGE } from '@constants/languages';
import type { LanguageCode } from '@constants/languages';
import { cityNamesSchema } from '@schemas/city-names.schema';
import { languageSchema } from '@shared/i18n/language.schema';
import type { CityName } from './city-name.types';

// One small file per language, fetched the first time a screen needs it (D-117): `/cities/<code>.json`
// on the site, put there by `npm run cities:upload`, not part of the build.
async function fetchCityNames(language: LanguageCode): Promise<CityName[]> {
  const response = await fetch(`${CITY_FILES_PATH}/${language}.json`);
  if (!response.ok) throw new Error(`The ${language} city file did not load`);
  return cityNamesSchema.parse(await response.json()).map(([id, name, english]) => ({
    id,
    name,
    english,
  }));
}

/** The places, named in the language the app is showing; only that language's file is loaded. */
export function useCities() {
  const { i18n } = useTranslation();
  const language = languageSchema.catch(DEFAULT_LANGUAGE).parse(i18n.language);
  return useQuery({
    queryKey: ['cities', language],
    queryFn: () => fetchCityNames(language),
    staleTime: Infinity,
  });
}
