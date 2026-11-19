/** The keys that drive the open list of suggestions under a text box. */
export enum SuggestionKey {
  Next = 'ArrowDown',
  Previous = 'ArrowUp',
  Choose = 'Enter',
  Close = 'Escape',
}

export enum SuggestionListEventKind {
  Typed,
  Stepped,
  Closed,
}

export interface SuggestionListState {
  readonly isOpen: boolean;
  /** The option Enter would choose. */
  readonly activeIndex: number;
}

export type SuggestionListEvent =
  | { readonly kind: SuggestionListEventKind.Typed }
  | {
      readonly kind: SuggestionListEventKind.Stepped;
      /** 1 for the next option, -1 for the previous one. */
      readonly step: number;
      readonly optionCount: number;
    }
  | { readonly kind: SuggestionListEventKind.Closed };
