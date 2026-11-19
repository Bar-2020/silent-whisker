// Builds shared/constants/cities.json from the government's list of localities in Hebrew, English,
// Arabic and Russian (data.gov.il, "יישובים ומדינות", National Digital Agency; D-117).
// Run by hand when the list changes: `node scripts/build-cities.mjs`, then `npm run lint:fix` to
// format the files. The results are committed.
import { writeFileSync } from 'node:fs';

const SOURCE =
  'https://data.gov.il/api/3/action/datastore_search?resource_id=e9701dcb-9f1c-43bb-bd44-eb380ade542f&limit=5000';
const OUTPUT = new URL('../shared/constants/cities.json', import.meta.url);
const NAMES_FOLDER = '../frontend/src/features/profile/cities/names/';
// The app's languages (shared/constants/languages.ts).
const LANGUAGES = ['he', 'en', 'ar', 'ru'];

// Israeli Transverse Mercator (EPSG:2039, GRS80) to latitude and longitude, by Krueger's series.
const A = 6378137;
const F = 1 / 298.257222101;
const K0 = 1.0000067;
const LAT0 = (31.734393611111 * Math.PI) / 180;
const LON0 = (35.204516944444 * Math.PI) / 180;
const FALSE_EASTING = 219529.584;
const FALSE_NORTHING = 626907.39;
const n = F / (2 - F);
const e = Math.sqrt(F * (2 - F));
const radius = (A / (1 + n)) * (1 + n ** 2 / 4 + n ** 4 / 64);
const alpha = [
  n / 2 - (2 * n ** 2) / 3 + (5 * n ** 3) / 16 + (41 * n ** 4) / 180,
  (13 * n ** 2) / 48 - (3 * n ** 3) / 5 + (557 * n ** 4) / 1440,
  (61 * n ** 3) / 240 - (103 * n ** 4) / 140,
  (49561 * n ** 4) / 161280,
];
const beta = [
  n / 2 - (2 * n ** 2) / 3 + (37 * n ** 3) / 96 - n ** 4 / 360,
  n ** 2 / 48 + n ** 3 / 15 - (437 * n ** 4) / 1440,
  (17 * n ** 3) / 480 - (37 * n ** 4) / 840,
  (4397 * n ** 4) / 161280,
];
const northing0 = (() => {
  const t = Math.sinh(Math.atanh(Math.sin(LAT0)) - e * Math.atanh(e * Math.sin(LAT0)));
  const xi = Math.atan(t);
  return K0 * radius * (xi + alpha.reduce((sum, a, j) => sum + a * Math.sin(2 * (j + 1) * xi), 0));
})();

function toLatLng(x, y) {
  const xi = (y - FALSE_NORTHING + northing0) / (K0 * radius);
  const eta = (x - FALSE_EASTING) / (K0 * radius);
  const xiPrime =
    xi -
    beta.reduce(
      (sum, b, j) => sum + b * Math.sin(2 * (j + 1) * xi) * Math.cosh(2 * (j + 1) * eta),
      0
    );
  const etaPrime =
    eta -
    beta.reduce(
      (sum, b, j) => sum + b * Math.cos(2 * (j + 1) * xi) * Math.sinh(2 * (j + 1) * eta),
      0
    );
  const chi = Math.asin(Math.sin(xiPrime) / Math.cosh(etaPrime));
  let phi = chi;
  for (let i = 0; i < 10; i += 1) {
    phi = Math.asin(Math.tanh(Math.atanh(Math.sin(chi)) + e * Math.atanh(e * Math.sin(phi))));
  }
  const lambda = LON0 + Math.atan(Math.sinh(etaPrime) / Math.cos(xiPrime));
  const round = (radians) => Math.round(((radians * 180) / Math.PI) * 1e5) / 1e5;
  return { lat: round(phi), lng: round(lambda) };
}

// The list writes English names in capitals: "BE'ER SHEVA" becomes "Be'er Sheva".
const titleCase = (text) =>
  text
    .toLowerCase()
    .replace(/(^|[ \-(])([a-z])/g, (_, before, letter) => before + letter.toUpperCase());

const clean = (text) => (typeof text === 'string' && text.trim() !== '' ? text.trim() : undefined);

const response = await fetch(SOURCE, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!response.ok) throw new Error(`The list answered ${response.status}`);
const { result } = await response.json();

const cities = result.records
  .map((record) => {
    const hasPlace = typeof record.X === 'number' && typeof record.Y === 'number';
    const english = clean(record.name_in_english);
    return {
      id: record.symbol_number,
      he: clean(record.name_in_hebrew),
      en: english && titleCase(english),
      ar: clean(record.name_in_arabic),
      ru: clean(record.name_in_russian),
      ...(hasPlace ? toLatLng(record.X, record.Y) : {}),
    };
  })
  .sort((a, b) => a.id - b.id);

const lines = (rows) => `[\n${rows.map((row) => `  ${JSON.stringify(row)}`).join(',\n')}\n]\n`;
writeFileSync(OUTPUT, lines(cities));

// What a phone needs, one small file per language (D-117): [code, the name in that language (the
// English one where the list has none), the English name (for typing in Latin letters), 1 when the
// place has a Russian name in the list, which is how the better-known places are told apart].
for (const language of LANGUAGES) {
  const rows = cities.map((city) => [city.id, city[language] ?? city.en, city.en, city.ru ? 1 : 0]);
  writeFileSync(new URL(`${NAMES_FOLDER}${language}.json`, import.meta.url), lines(rows));
}
console.log(`${cities.length} cities written`);
