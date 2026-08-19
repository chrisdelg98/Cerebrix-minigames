import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Cell } from '@design/components/Cell';

/**
 * El toque que empieza sobre el DIBUJO de una casilla.
 *
 * Un toque captura el puntero en el elemento donde empezó. Si ese elemento es
 * el contenido de la casilla y no el botón, el arrastre se queda pegado ahí y
 * `onPointerEnter` no llega nunca a las casillas de al lado.
 *
 * Reportado en Trazo: el disco con el número tapa el 62% de la casilla, así que
 * empezar el trazo desde el número no funcionaba y había que apuntar al borde.
 * Nonograma tenía el mismo problema al arrastrar desde una casilla con ✕.
 */

function renderCell(props: { onPointerEnter?: () => void } = {}) {
  render(
    <Cell
      label="fila 1, columna 1"
      value={<span data-testid="dibujo">7</span>}
      onPointerDown={() => undefined}
      {...props}
    />
  );
  return {
    button: screen.getByRole('gridcell'),
    drawing: screen.getByTestId('dibujo'),
  };
}

/** Simula la captura implícita: la tiene el elemento donde cayó el dedo. */
function withCapture(element: Element, pointerId: number) {
  const release = vi.fn();
  element.hasPointerCapture = (id: number) => id === pointerId;
  element.releasePointerCapture = release;
  return release;
}

describe('la captura implícita del puntero en una casilla', () => {
  it('la suelta desde el dibujo cuando el dedo cayó sobre el dibujo', () => {
    const { button, drawing } = renderCell({ onPointerEnter: () => undefined });
    const release = withCapture(drawing, 1);
    // El botón NO la tiene: soltarla desde él sería no hacer nada, que es lo
    // que hacía cada tablero por su cuenta.
    button.hasPointerCapture = () => false;

    fireEvent.pointerDown(drawing, { pointerId: 1 });

    expect(release).toHaveBeenCalledWith(1);
  });

  it('la suelta desde el botón cuando el dedo cayó en el botón', () => {
    const { button } = renderCell({ onPointerEnter: () => undefined });
    const release = withCapture(button, 1);

    fireEvent.pointerDown(button, { pointerId: 1 });

    expect(release).toHaveBeenCalledWith(1);
  });

  /* Soltarla en un tablero que no se dibuja arrastrando sería cambiarle el
     comportamiento a alguien que no lo pidió. */
  it('no la toca en un tablero que no escucha onPointerEnter', () => {
    const { button } = renderCell();
    const release = withCapture(button, 1);

    fireEvent.pointerDown(button, { pointerId: 1 });

    expect(release).not.toHaveBeenCalled();
  });

  it('le pasa el evento al tablero igual', () => {
    const onPointerDown = vi.fn();
    render(
      <Cell
        label="fila 1, columna 1"
        value={<span data-testid="dibujo">7</span>}
        onPointerDown={onPointerDown}
        onPointerEnter={() => undefined}
      />
    );

    fireEvent.pointerDown(screen.getByTestId('dibujo'), { pointerId: 1 });

    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});
