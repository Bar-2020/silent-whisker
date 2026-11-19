import { z } from 'zod';
import { SuggestionKey } from './suggestion-list-state.types';

/** The key of a key press when it is one the list answers to; `safeParse` of any other key has no `data`. */
export const suggestionKeySchema = z.enum(SuggestionKey);
