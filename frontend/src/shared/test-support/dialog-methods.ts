import { fireEvent } from '@testing-library/react';

/** jsdom may lack the `<dialog>` methods; this gives them the effect a browser has on `open` and `close`. */
export function installDialogMethods(): void {
  const proto = HTMLDialogElement.prototype;
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement): void {
      this.setAttribute('open', '');
    };
  }
  if (typeof proto.close !== 'function') {
    proto.close = function close(this: HTMLDialogElement): void {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}

/** What a browser does for Escape on an open modal dialog: the key, then `cancel`, then `close` unless refused. */
export function pressEscapeIn(dialog: HTMLDialogElement): void {
  const keyAllowed = fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
  if (!keyAllowed) return;
  const cancelAllowed = fireEvent(dialog, new Event('cancel', { cancelable: true }));
  if (cancelAllowed) dialog.close();
}
