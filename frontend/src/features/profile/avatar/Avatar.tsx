import { useState } from 'react';
import { AVATAR_INITIALS_COUNT } from '@constants/profile';
import styles from './Avatar.module.css';

/** The first letter of each of the first words, taken as characters so an emoji is never cut in half (ME-05). */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/u)
    .slice(0, AVATAR_INITIALS_COUNT)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}

/** The member's own Google photo when they chose it, otherwise (and when the address is broken) their initials (D-21). */
export function Avatar({
  name,
  photoUrl,
  size,
}: {
  name: string;
  photoUrl: string | null;
  size: 'small' | 'large';
}) {
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const showPhoto = photoUrl !== null && photoUrl !== brokenUrl;

  return (
    <span className={styles.avatar} data-size={size} aria-hidden="true">
      {showPhoto ? (
        <img
          className={styles.photo}
          src={photoUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => {
            setBrokenUrl(photoUrl);
          }}
        />
      ) : (
        <span dir="auto">{initialsOf(name)}</span>
      )}
    </span>
  );
}
