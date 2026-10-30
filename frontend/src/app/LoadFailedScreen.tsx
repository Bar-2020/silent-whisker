import { Icon } from '../shared/icons/Icon';
import styles from './LoadFailedScreen.module.css';

/** Icon only: the language files are what failed to load, so there is no text to show (D-32). */
export function LoadFailedScreen() {
  return (
    <div className={styles.screen}>
      <button
        type="button"
        className={styles.retry}
        onClick={() => {
          window.location.reload();
        }}
      >
        <Icon name="retry" />
      </button>
    </div>
  );
}
