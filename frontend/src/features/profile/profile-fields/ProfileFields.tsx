import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { UserIcon } from '@shared/components/icon/UserIcon';
import { FormMessage } from '../form-message/FormMessage';
import { MemberAvatar } from '../member-avatar/MemberAvatar';
import { AvatarSize } from '../member-avatar/MemberAvatar.types';
import { ProfileFieldFrame } from '../profile-field-frame/ProfileFieldFrame';
import { PhotoChoice } from '../profile-form.types';
import type { ProfileFormValues } from '../profile-form.types';
import { ProfileTextBox } from '../profile-text-box/ProfileTextBox';
import styles from './ProfileFields.module.css';
import { useCityField } from './use-city-field';

/** The ids a text box points its `aria-describedby` at: its hint, and its error once there is one. */
const describedBy = (hintId: string, errorId: string, errorMessage: string | undefined): string =>
  errorMessage ? `${hintId} ${errorId}` : hintId;

/**
 * The questions both profile forms ask (DESIGN.md, Inputs): the full name, the city picked from the
 * list (D-117) and, when Google sent a photo, whether to show it (D-27). Each question is a function
 * below; the city keeps its form logic in a hook, there is no generic field.
 */
export function ProfileFields({ hasGooglePhoto }: { hasGooglePhoto: boolean }) {
  return (
    <>
      <ProfileFullNameQuestion />
      <ProfileCityQuestion />
      {hasGooglePhoto && <ProfilePhotoQuestion />}
    </>
  );
}

function ProfileFullNameQuestion() {
  const { t } = useTranslation();
  const {
    register,
    clearErrors,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const errorMessage = errors.fullName?.message;

  return (
    <ProfileFieldFrame
      id={id}
      label={t('firstrun.name.label')}
      hintId={hintId}
      hint={t('firstrun.name.hint')}
      below={errorMessage && <FormMessage id={errorId} message={errorMessage} />}
    >
      <ProfileTextBox
        id={id}
        autoComplete="name"
        placeholder={t('firstrun.name.placeholder')}
        aria-required="true"
        aria-invalid={errorMessage !== undefined}
        aria-describedby={describedBy(hintId, errorId, errorMessage)}
        // Typing on takes the server's refusal away, so the member can try again (FIRST-09).
        {...register('fullName', {
          onChange: () => {
            clearErrors('root.server');
          },
        })}
      />
    </ProfileFieldFrame>
  );
}

function ProfileCityQuestion() {
  const { t } = useTranslation();
  const city = useCityField();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const listId = `${id}-list`;
  const optionId = (index: number): string => `${id}-option-${String(index)}`;

  return (
    <ProfileFieldFrame
      id={id}
      label={t('firstrun.city.label')}
      hintId={hintId}
      hint={t('firstrun.city.hint')}
      below={
        <>
          {city.notices.hasNoMatch && (
            <p role="status" className={styles.cityNotice}>
              {t('firstrun.city.noMatch')}
            </p>
          )}
          {city.notices.isCityListUnavailable && (
            <FormMessage id={`${id}-load-error`} message={t('profile.error.unavailable')} />
          )}
          {city.notices.errorMessage && (
            <FormMessage id={errorId} message={city.notices.errorMessage} />
          )}
        </>
      }
    >
      <div className={styles.cityBox}>
        <ProfileTextBox
          id={id}
          ref={city.input.ref}
          role="combobox"
          autoComplete="off"
          placeholder={t('firstrun.city.placeholder')}
          value={city.input.text}
          aria-required="true"
          aria-invalid={city.notices.errorMessage !== undefined}
          aria-describedby={describedBy(hintId, errorId, city.notices.errorMessage)}
          aria-autocomplete="list"
          aria-expanded={city.suggestions.isShowing}
          aria-controls={listId}
          aria-activedescendant={
            city.suggestions.isShowing ? optionId(city.suggestions.activeIndex) : undefined
          }
          onChange={city.input.onChange}
          onKeyDown={city.input.onKeyDown}
          onBlur={city.input.onBlur}
        />
        {city.suggestions.isShowing && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t('firstrun.city.label')}
            className={styles.cityList}
          >
            {city.suggestions.cities.map((suggestedCity, index) => (
              <li
                key={suggestedCity.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === city.suggestions.activeIndex}
                className={styles.cityOption}
                // The box keeps the focus while an option is pressed, so choosing does not close the list first.
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  city.suggestions.pick(suggestedCity);
                }}
              >
                {suggestedCity.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProfileFieldFrame>
  );
}

function ProfilePhotoQuestion() {
  const { t } = useTranslation();
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const chosenAnswer = watch('photoChoice');
  const errorMessage = errors.photoChoice?.message;
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <fieldset
      className={styles.photoQuestion}
      aria-describedby={errorMessage ? errorId : undefined}
    >
      <legend className={styles.photoLegend}>{t('firstrun.photo.label')}</legend>
      <p className={styles.photoHint}>{t('firstrun.photo.hint')}</p>
      <div className={styles.photoChoices}>
        <label className={styles.photoChoice}>
          <input type="radio" value={PhotoChoice.Show} {...register('photoChoice')} />
          <span className={styles.photoTile}>
            <span className={styles.photoStand}>
              <UserIcon />
            </span>
            {t('firstrun.photo.yes')}
            {chosenAnswer === PhotoChoice.Show && (
              <span className={styles.photoMark}>
                <CheckIcon />
              </span>
            )}
          </span>
        </label>
        <label className={styles.photoChoice}>
          <input type="radio" value={PhotoChoice.Initials} {...register('photoChoice')} />
          <span className={styles.photoTile}>
            <MemberAvatar fullName={watch('fullName')} photoUrl={null} size={AvatarSize.Small} />
            {t('firstrun.photo.no')}
            {chosenAnswer === PhotoChoice.Initials && (
              <span className={styles.photoMark}>
                <CheckIcon />
              </span>
            )}
          </span>
        </label>
      </div>
      {errorMessage && <FormMessage id={errorId} message={errorMessage} />}
    </fieldset>
  );
}
