import citiesJson from '../../shared/constants/cities.json';
import { cityListSchema } from '../../shared/schemas/city.schema';
import type { City } from '../../shared/schemas/city.schema';

const citiesById = new Map(cityListSchema.parse(citiesJson).map((city) => [city.id, city]));

/** The city with this code, or nothing for a code that is not on the list (D-117). */
export const findCity = (id: number): City | undefined => citiesById.get(id);
