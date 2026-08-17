import { useEffect, useRef, type ReactNode } from 'react';

import s from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons for the bottom row. */
  actions?: ReactNode;
  /**
   * Centra el encabezado. Para los momentos que se celebran y no se leen: el
   * título alineado a la izquierda es correcto para un formulario y frío para
   * un "¡Ganaste!".
   */
  centered?: boolean;
  /**
   * Si un clic afuera cierra. Por defecto sí.
   *
   * La pantalla de victoria lo apaga: un clic distraído en cualquier parte
   * borraba el resultado antes de poder leerlo, y ganar merece durar lo que el
   * jugador quiera. La cruz y Esc siguen estando.
   */
  dismissOnBackdrop?: boolean;
}

/**
 * Built on native <dialog>: the focus trap, the Esc key, inertness of the page
 * behind, and the top layer all come from the platform. A hand-rolled modal
 * gets at least one of those wrong.
 * Reference: docs/DESIGN_SYSTEM.md §9.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  centered,
  dismissOnBackdrop = true,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // Fires for Esc too, so there is one single close path.
    const handleClose = () => {
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`${s.modal} ${open ? (centered === true ? 'anim-bounce-in' : 'anim-slide-up') : ''}`}
      aria-labelledby="modal-title"
      // The backdrop is part of the dialog box, so a click landing on the
      // element itself (not on its content) is a click outside.
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === ref.current) onClose();
      }}
    >
      <div className={s.panel} data-centered={centered === true}>
        <button type="button" className={s.close} aria-label="Cerrar ventana" onClick={onClose}>
          ✕
        </button>
        <h2 id="modal-title" className={s.title}>
          {title}
        </h2>
        <div className={s.body}>{children}</div>
        {actions !== undefined && <div className={s.actions}>{actions}</div>}
      </div>
    </dialog>
  );
}
