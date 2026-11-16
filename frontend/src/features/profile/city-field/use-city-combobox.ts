import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CITY_SUGGESTIONS_LIMIT } from '@constants/profile';
import type { City } from '@schemas/city.schema';
import { cityName, matchCities } from '../cities/city-name';
import { useCities } from '../cities/use-cities';
import type { ProfileFormValues } from '../profile-form.types';

/**
 * What the city box needs to behave as a combobox (D-117): the text it shows, the places that match
 * it, which one is active, and the handlers. The form's value is the code of the place picked, or null.
 */
export function useCityCombobox() {
  const { i18n } = useTranslation();
  const { control, clearErrors } = useFormContext<ProfileFormValues>();
  const { field, fieldState } = useController({ name: 'cityId', control });
  const { data: cities = [], isError } = useCities();
  // What the member typed; null while the box shows the picked city's name in the app's language.
  const [typed, setTyped] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const picked = cities.find((city) => city.id === field.value);
  const text = typed ?? (picked ? cityName(picked, i18n.language) : '');
  const matches = typed === null ? [] : matchCities(cities, typed, CITY_SUGGESTIONS_LIMIT);
  const isListOpen = isOpen && matches.length > 0;
  const hasNoMatch = isOpen && typed !== null && typed.trim() !== '' && matches.length === 0;

  const choose = (city: City) => {
    field.onChange(city.id);
    setTyped(null);
    setIsOpen(false);
    clearErrors('root.server');
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTyped(event.target.value);
    setIsOpen(true);
    setActiveIndex(0);
    field.onChange(null);
    clearErrors('root.server');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex(Math.min(Math.max(activeIndex + step, 0), matches.length - 1));
    } else if (event.key === 'Enter' && isListOpen) {
      // Choosing from the list must not also send the form.
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };
  const onBlur = () => {
    setIsOpen(false);
    field.onBlur();
  };

  return {
    inputRef: field.ref,
    text,
    matches,
    activeIndex,
    isListOpen,
    hasNoMatch,
    isLoadFailed: isError,
    message: fieldState.error?.message,
    choose,
    onChange,
    onKeyDown,
    onBlur,
  };
}
