import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom implements neither matchMedia nor the ResizeObserver the responsive
// board sizing relies on. Stub both so component tests can mount.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/*
 * jsdom 30 ships <dialog> with no methods at all — not showModal, not even
 * close. <Modal> is built on the native element precisely so the focus trap,
 * the Esc key, the top layer and the inertness of the page behind come from the
 * platform; this stub emulates only open/close plus the `close` event.
 *
 * So: what a test here can assert is that the modal opens, closes, and routes
 * every close through one handler. Esc, focus trapping and inertness are the
 * browser's job and are NOT covered by these tests — they belong to the Phase 7
 * keyboard and screen-reader audit.
 */
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(
    this: HTMLDialogElement,
    returnValue?: string
  ) {
    this.open = false;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
}
