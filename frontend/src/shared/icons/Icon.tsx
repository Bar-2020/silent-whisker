import styles from './Icon.module.css';

const PATHS = {
  cat: (
    <>
      <path d="M4 10.6V4.9c0-.7.7-1 1.2-.7l3.6 2.3c2.1-.5 4.3-.5 6.4 0l3.6-2.3c.5-.3 1.2 0 1.2.7v5.7c.4.9.6 1.9.6 2.8 0 4-3.7 6.7-8.6 6.7S3.4 17.4 3.4 13.4c0-.9.2-1.9.6-2.8z" />
      <path d="M9 13h.01M15 13h.01" />
      <path d="M10.9 15.5h2.2L12 16.9z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  retry: <path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" />,
};

export type IconName = keyof typeof PATHS;

/** The icon set of design/mocks/icons.js: 24px grid, 2px stroke, round ends. Add a path when a screen needs one. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
