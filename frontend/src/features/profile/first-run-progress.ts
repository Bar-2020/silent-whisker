import { FIRST_RUN_STORAGE_PREFIX, INSTALL_STEP_DONE_STORAGE_KEY } from '@constants/first-run';
import { removeStoredKeysWithPrefix } from '@shared/utils/stored-keys';

export const isInstallStepDone = (): boolean =>
  localStorage.getItem(INSTALL_STEP_DONE_STORAGE_KEY) !== null;

export const markInstallStepDone = (): void => {
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'done');
};

/** Deleting the account starts the first run again on this device (ME-03, D-110). */
export const forgetFirstRunProgress = (): void => {
  removeStoredKeysWithPrefix(FIRST_RUN_STORAGE_PREFIX);
};
