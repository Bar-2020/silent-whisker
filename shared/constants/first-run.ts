/** Every per-device flag of the first run starts with this, so deleting the account clears them all (D-110). */
export const FIRST_RUN_STORAGE_PREFIX = 'first-run.';

/** Set when the member presses Continue on the install step, never earlier, so closing the tab resumes at it (D-110). */
export const INSTALL_STEP_DONE_STORAGE_KEY = `${FIRST_RUN_STORAGE_PREFIX}install-done`;
