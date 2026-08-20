import { describe, expect, it } from 'vitest';

import { CROWNED_FROM, isCrowned, SPARKS_FROM, SPARKS_FULL, sparkIntensity } from '@core/streak';

/**
 * La escala del festejo de la racha.
 *
 * El efecto tiene que ser un incentivo, no una distracción encima de la
 * pantalla que existe para elegir un juego: por eso empieza tarde, arranca
 * visible y tiene techo.
 */
describe('sparkIntensity', () => {
  it('no festeja nada por debajo del umbral', () => {
    for (let streak = 0; streak < SPARKS_FROM; streak += 1) {
      expect(sparkIntensity(streak), `racha ${String(streak)}`).toBeNull();
    }
  });

  it('la primera vez ya se nota: no debuta en cero', () => {
    const first = sparkIntensity(SPARKS_FROM);
    expect(first).not.toBeNull();
    expect(first).toBeGreaterThan(0.2);
  });

  /*
   * Los puntos salen de las constantes, no de números escritos acá.
   *
   * Estaba probado con 7, 10 y 15 fijos, y al mover la escala para ver cómo se
   * veía el máximo, dos de esos tres quedaron pasados del techo: el test falló
   * por el ajuste y no por el código. La propiedad que importa —que crecer la
   * racha aumente el premio— vale para cualquier escala, así que se prueba así.
   */
  it('crece con la racha', () => {
    const medio = Math.floor((SPARKS_FROM + SPARKS_FULL) / 2);

    const bajo = sparkIntensity(SPARKS_FROM) ?? 0;
    const medioValor = sparkIntensity(medio) ?? 0;
    const alto = sparkIntensity(SPARKS_FULL) ?? 0;

    expect(medioValor).toBeGreaterThan(bajo);
    expect(alto).toBeGreaterThan(medioValor);
  });

  it('tiene techo: a partir de veinte no crece más', () => {
    expect(sparkIntensity(SPARKS_FULL)).toBe(1);
    expect(sparkIntensity(100)).toBe(1);
    expect(sparkIntensity(10_000)).toBe(1);
  });

  it('nunca se sale de 0 a 1', () => {
    for (const streak of [7, 8, 13, 19, 20, 21, 500]) {
      const value = sparkIntensity(streak) ?? 0;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

/*
 * El anillo es un ESCALÓN, no la continuación de la rampa: aparece de golpe un
 * paso más allá del techo de las chispas, para que cruzarlo se sienta como
 * llegar a otra cosa y no a un poco más de lo mismo.
 */
describe('el nivel máximo', () => {
  it('empieza justo un paso después del techo de las chispas', () => {
    expect(CROWNED_FROM).toBe(SPARKS_FULL + 1);
  });

  it('no corona al que apenas llegó al techo', () => {
    expect(isCrowned(SPARKS_FULL)).toBe(false);
    expect(isCrowned(SPARKS_FROM)).toBe(false);
    expect(isCrowned(0)).toBe(false);
  });

  it('corona desde ahí en adelante', () => {
    expect(isCrowned(CROWNED_FROM)).toBe(true);
    expect(isCrowned(CROWNED_FROM + 40)).toBe(true);
  });

  /*
   * Se calcula a partir de SPARKS_FULL, así que mover el techo lo mueve solo.
   * Es lo que evita dos números que haya que acordarse de cambiar juntos.
   */
  it('sigue al techo si el techo se mueve', () => {
    expect(isCrowned(SPARKS_FULL)).toBe(false);
    expect(isCrowned(SPARKS_FULL + 1)).toBe(true);
  });
});
