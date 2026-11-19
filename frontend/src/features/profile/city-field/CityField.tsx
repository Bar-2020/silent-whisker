import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FormMessage } from '../form-message/FormMessage';
import { ProfileFieldFrame } from '../profile-field-frame/ProfileFieldFrame';
import { ProfileTextBox } from '../profile-text-box/ProfileTextBox';
import styles from './CityField.module.css';
import { useCityCombobox } from './use-city-combobox';

/**
 * The city is picked from the list, never typed free (D-117): typing narrows the list in any of the
 * four languages, and only a place the member chose from it counts. The form holds the place's code.
 */
export function CityField() {
  const { t } = useTranslation();
  const combobox = useCityCombobox();
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const { message } = combobox;

  return (
    <ProfileFieldFrame
      id={id}
      label={t('firstrun.city.label')}
      hintId={hintId}
      hint={t('firstrun.city.hint')}
      below={
        <>
          {combobox.hasNoMatch && (
            <p role="status" className={styles.status}>
              {t('firstrun.city.noMatch')}
            </p>
          )}
          {combobox.isLoadFailed && (
            <FormMessage id={`${id}-load-error`} message={t('profile.error.unavailable')} />
          )}
          {message && <FormMessage id={errorId} message={message} />}
        </>
      }
    >
      <div className={styles.box}>
        <ProfileTextBox
          id={id}
          ref={combobox.inputRef}
          role="combobox"
          autoComplete="off"
          placeholder={t('firstrun.city.placeholder')}
          value={combobox.text}
          aria-required="true"
          aria-invalid={message !== undefined}
          aria-describedby={message ? `${hintId} ${errorId}` : hintId}
          aria-autocomplete="list"
          aria-expanded={combobox.isListOpen}
          aria-controls={listId}
          aria-activedescendant={
            combobox.isListOpen ? `${id}-option-${combobox.activeIndex}` : undefined
          }
          onChange={combobox.onChange}
          onKeyDown={combobox.onKeyDown}
          onBlur={combobox.onBlur}
        />
        {combobox.isListOpen && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t('firstrun.city.label')}
            className={styles.list}
          >
            {combobox.matches.map((city, index) => (
              <li
                key={city.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === combobox.activeIndex}
                className={styles.option}
                // The box keeps the focus while an option is pressed, so choosing does not close the list first.
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  combobox.choose(city);
                }}
              >
                {city.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProfileFieldFrame>
  );
}
