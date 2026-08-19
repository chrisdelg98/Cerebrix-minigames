import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/*
 * Cuánto esperan `findBy*` y `waitFor` antes de darse por vencidos.
 *
 * El default es 1 segundo, y no alcanza para abrir un juego: entrar a una ruta
 * dispara el import() de la ruta, el import() del módulo del juego y una
 * lectura del storage, todo encadenado y todo pasando por la transformación de
 * Vite la primera vez. Con la suite entera corriendo en paralelo eso se pasa
 * del segundo seguido — pero no siempre, así que fallaban entre cuatro y ocho
 * tests DISTINTOS en cada corrida.
 *
 * El costo de eso no era la molestia: era que la suite dejó de servir para
 * avisar. Con fallos que cambian de nombre corrida a corrida, romper algo de
 * verdad se ve exactamente igual que no romper nada.
 *
 * No es tapar un problema de rendimiento. En producción los chunks van
 * compilados y precargados; lo lento es el pipeline del test, y esperarlo es lo
 * correcto. Se pone acá una vez en vez de en cada llamada para que el próximo
 * test no tenga que descubrirlo de nuevo.
 */
configure({ asyncUtilTimeout: 5000 });

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
