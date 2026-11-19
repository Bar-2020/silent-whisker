import { useMemo, useReducer, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { CITY_SUGGESTIONS_LIMIT } from '@constants/profile';
import { findMatchingCities } from '../cities/city-name';
import type { CityName } from '../cities/city-name.types';
import { useCities } from '../cities/use-cities';
import type { ProfileFormValues } from '../profile-form.types';
import { suggestionKeySchema } from './suggestion-key.schema';
import { CLOSED_SUGGESTION_LIST, suggestionListReducer } from './suggestion-list-state';
import { SuggestionKey, SuggestionListEventKind } from './suggestion-list-state.types';

/**
 * The city box as a combobox (D-117). The form's value is the code of the place the member picked,
 * or null; the box shows what they typed until they pick one, then that place's name.
 */
export function useCityField() {
  const { control, clearErrors } = useFormContext<ProfileFormValues>();
  const { field, fieldState } = useController({ name: 'cityId', control });
  const { data: cityNames = [], isError: isCityListUnavailable } = useCities();
  // null while the box shows the picked city's name in the app's language.
  const [typedText, setTypedText] = useState<string | null>(null);
  const [suggestionList, dispatchSuggestionList] = useReducer(
    suggestionListReducer,
    CLOSED_SUGGESTION_LIST
  );

  const pickedCity = cityNames.find(({ id }) => id === field.value);
  const matchingCities = useMemo(
    () =>
      typedText === null ? [] : findMatchingCities(cityNames, typedText, CITY_SUGGESTIONS_LIMIT),
    [cityNames, typedText]
  );
  const isListShowing = suggestionList.isOpen && matchingCities.length > 0;
  const hasNoMatch =
    suggestionList.isOpen &&
    typedText !== null &&
    typedText.trim() !== '' &&
    matchingCities.length === 0;

  const pickCity = (city: CityName) => {
    field.onChange(city.id);
    setTypedText(null);
    dispatchSuggestionList({ kind: SuggestionListEventKind.Closed });
    clearErrors('root.server');
  };
  const handleTyping = (event: ChangeEvent<HTMLInputElement>) => {
    setTypedText(event.target.value);
    dispatchSuggestionList({ kind: SuggestionListEventKind.Typed });
    field.onChange(null);
    clearErrors('root.server');
  };
  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const key = suggestionKeySchema.safeParse(event.key).data;
    switch (key) {
      case SuggestionKey.Next:
      case SuggestionKey.Previous:
        event.preventDefault();
        dispatchSuggestionList({
          kind: SuggestionListEventKind.Stepped,
          step: key === SuggestionKey.Next ? 1 : -1,
          optionCount: matchingCities.length,
        });
        break;
      case SuggestionKey.Choose:
        if (isListShowing) {
          // Choosing from the list must not also send the form.
          event.preventDefault();
          pickCity(matchingCities[suggestionList.activeIndex]);
        }
        break;
      case SuggestionKey.Close:
        dispatchSuggestionList({ kind: SuggestionListEventKind.Closed });
        break;
    }
  };
  const handleBlur = () => {
    dispatchSuggestionList({ kind: SuggestionListEventKind.Closed });
    field.onBlur();
  };

  return {
    input: {
      ref: field.ref,
      text: typedText ?? pickedCity?.name ?? '',
      onChange: handleTyping,
      onKeyDown: handleKey,
      onBlur: handleBlur,
    },
    suggestions: {
      isShowing: isListShowing,
      cities: matchingCities,
      activeIndex: suggestionList.activeIndex,
      pick: pickCity,
    },
    notices: {
      hasNoMatch,
      isCityListUnavailable,
      errorMessage: fieldState.error?.message,
    },
  };
}
