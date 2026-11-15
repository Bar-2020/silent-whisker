import { useState } from 'react';
import { AVATAR_INITIALS_COUNT } from '@constants/profile';
import { AvatarSize } from './MemberAvatar.types';
import styles from './MemberAvatar.module.css';

const GRAPHEME_SEGMENTER = new Intl.Segmenter();

/** The first visible character of a word, whole: an emoji or a letter with its marks is never cut apart (ME-05). */
function getFirstCharacter(word: string): string {
  return GRAPHEME_SEGMENTER.segment(word)[Symbol.iterator]().next().value?.segment ?? '';
}

/** The first character of each of the first words of the name, in capitals. */
function getInitialsFromName(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/u)
    .slice(0, AVATAR_INITIALS_COUNT)
    .map(getFirstCharacter)
    .join('')
    .toLocaleUpperCase();
}

/** The member's own Google photo when they chose it, otherwise (and when the address is broken) their initials (D-21). */
export function MemberAvatar({
  fullName,
  photoUrl,
  size,
}: {
  fullName: string;
  photoUrl: string | null;
  size: AvatarSize;
}) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const shouldShowPhoto = photoUrl !== null && photoUrl !== failedPhotoUrl;

  return (
    <span className={styles.avatar} data-size={size} aria-hidden="true">
      {shouldShowPhoto ? (
        <img
          className={styles.photo}
          src={photoUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => {
            setFailedPhotoUrl(photoUrl);
          }}
        />
      ) : (
        <span dir="auto">{getInitialsFromName(fullName)}</span>
      )}
    </span>
  );
}
