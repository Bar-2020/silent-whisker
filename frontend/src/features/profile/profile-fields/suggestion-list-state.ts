import { SuggestionListEventKind } from './suggestion-list-state.types';
import type { SuggestionListEvent, SuggestionListState } from './suggestion-list-state.types';

export const CLOSED_SUGGESTION_LIST: SuggestionListState = { isOpen: false, activeIndex: 0 };

/** Typing opens the list at its first option; the arrows move through it and stop at its ends. */
export function suggestionListReducer(
  state: SuggestionListState,
  event: SuggestionListEvent
): SuggestionListState {
  switch (event.kind) {
    case SuggestionListEventKind.Typed:
      return { isOpen: true, activeIndex: 0 };
    case SuggestionListEventKind.Stepped:
      return {
        isOpen: true,
        activeIndex: Math.min(Math.max(state.activeIndex + event.step, 0), event.optionCount - 1),
      };
    case SuggestionListEventKind.Closed:
      return { ...state, isOpen: false };
  }
}
