import styles from './StepPin.module.css';

/** The map's spot marker, drawn as the steps show it: a teardrop in the colour of the state. */
export function StepPin() {
  return (
    <svg className={styles.pin} viewBox="0 0 46 56" aria-hidden="true">
      <path d="M23 54S5 37 5 22a18 18 0 1 1 36 0c0 15-18 32-18 32z" />
    </svg>
  );
}
