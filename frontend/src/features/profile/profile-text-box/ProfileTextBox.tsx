import type { ComponentProps } from 'react';
import styles from './ProfileTextBox.module.css';

/** The text box of the profile forms: the full name and the city share its look (DESIGN.md, Inputs). */
export function ProfileTextBox(props: ComponentProps<'input'>) {
  return <input type="text" className={styles.input} {...props} />;
}
