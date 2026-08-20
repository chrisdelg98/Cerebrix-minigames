import { useCallback, useEffect, useRef, useState } from 'react';

import { SCHEMA_VERSION } from '@storage/index';

import { type AnyArcadeModule } from '../arcade';
import { type Difficulty, type GameStatus } from '../contract';
import { asDifficulty } from '../difficulty';
import { useStorage } from '../storageContext';

/**
 * Todo lo que el shell maneja durante una partida con reloj.
 *
 * Es el gemelo de `useGameSession` y deliberadamente NO lo toca: los diez
 * juegos por turnos siguen corriendo el mismo código de siempre. Lo que cambia
 * es lo que cada uno necesita — acá no hay pila de deshacer ni autoguardado, y
 * en cambio hay un reloj, una pausa y una regla clara sobre qué pasa cuando la
 * pantalla se apaga.
 *
 * Sin pila: a ocho pasos por segundo, tres minutos de Snake son ~1500 copias
 * del tablero en memoria, y deshacer un paso que dio el reloj no significa nada.
 */

export type ArcadeLoader = () => Promise<{ default: AnyArcadeModule }>;

export type SessionPhase = 'loading' | 'ready' | 'error';

export interface ArcadeSession {
  phase: SessionPhase;
  error: Error | null;
  module: AnyArcadeModule | null;
  state: unknown;
  status: GameStatus;
  progress: number;
  difficulty: Difficulty;
  stepMs: number;
  /** Falso hasta que el jugador toca "Empezar": el reloj no corre antes. */
  started: boolean;
  paused: boolean;
  /** Identifica la partida. El cronómetro del shell se apoya en esto. */
  roundId: string;
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  dispatch: (move: unknown) => void;
  setDifficulty: (difficulty: Difficulty) => void;
}

const PLAYING: GameStatus = { kind: 'playing' };

function freshSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

export function useArcadeSession(load: ArcadeLoader, initialDifficulty: Difficulty): ArcadeSession {
  const storage = useStorage();

  const [module, setModule] = useState<AnyArcadeModule | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [seed, setSeed] = useState(freshSeed);
  /*
   * Todo lo de una partida viaja con SU ronda, y no se limpia con un efecto.
   *
   * Es el mismo reparto que usa `useGameSession`: un efecto que llama a
   * setState solo para resetear compra un renderizado en cascada a cambio de
   * nada, y React lo marca. Guardando la ronda al lado del valor, "¿esto es de
   * la partida actual?" se responde comparando, en el propio renderizado.
   */
  const [board, setBoard] = useState<{ round: string; value: unknown } | null>(null);
  const [startedRound, setStartedRound] = useState<string | null>(null);
  const [pausedRound, setPausedRound] = useState<string | null>(null);

  const round = `${String(difficulty)}:${seed}`;
  // El listener de visibilidad se registra una sola vez, así que lee la ronda
  // vigente por referencia en vez de volver a suscribirse en cada partida. Se
  // escribe en un efecto y nunca durante el renderizado: una ref mutada mientras
  // se renderiza se rompe en un renderizado reentrante, y React lo marca.
  const roundRef = useRef(round);
  const startedAt = useRef(0);
  const recorded = useRef<string | null>(null);

  /*
   * El tablero vigente, accesible desde el reloj sin ser una dependencia suya.
   *
   * Es lo que permite que girar no reprograme el reloj. Se escribe en un efecto
   * — nunca durante el renderizado — y también, sincrónicamente, en los dos
   * lugares que producen un tablero nuevo: el paso del reloj y la jugada del
   * jugador. Sin esa escritura sincrónica, dos entradas seguidas dentro del
   * mismo paso leerían las dos el tablero anterior y la segunda pisaría a la
   * primera.
   */
  const boardRef = useRef(board);

  useEffect(() => {
    roundRef.current = round;
    boardRef.current = board;
  }, [round, board]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((loaded) => {
        if (!cancelled) setModule(loaded.default);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(toError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // El nivel elegido para ESTE juego sobrevive a la sesión, igual que en el
  // resto del shell. La partida no: un arcade se vuelve a empezar.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (!module || bootedRef.current) return;
    bootedRef.current = true;

    void storage.loadDifficulty(module.meta.id).then((saved) => {
      const preferred = asDifficulty(saved, module.meta.difficulties);
      if (preferred !== null) setDifficulty(preferred);
    });
  }, [module, storage]);

  /*
   * El tablero de la ronda, creado durante el renderizado.
   *
   * Es el patrón que React documenta para "ajustar estado cuando cambia una
   * entrada": re-renderiza en el acto, sin pintar el estado viejo y sin pasar
   * por un efecto. Solo es posible porque `createInitialState` es SÍNCRONO en
   * este contrato — un arcade no genera nada pesado, y por eso se pidió así.
   */
  if (module !== null && board?.round !== round) {
    setBoard({
      round,
      value: module.engine.createInitialState(module.engine.getDifficultyConfig(difficulty), seed),
    });
  }

  const state = board?.round === round ? board.value : undefined;
  const started = startedRound === round;
  const paused = pausedRound === round;
  const ready = module !== null && state !== undefined;
  const status = ready && module ? module.engine.checkStatus(state) : PLAYING;
  const playing = status.kind === 'playing';
  const stepMs = ready && module ? module.engine.tickMs(state) : 1000;

  /*
   * El reloj, que se reprograma solo y NO depende del estado.
   *
   * Que no dependa es todo el punto. Antes el efecto tenía `state` entre sus
   * dependencias, así que cada jugada del jugador lo volvía a montar: su
   * limpieza cancelaba el paso que ya estaba en camino y arrancaba un intervalo
   * nuevo desde cero. Girar justo después de un paso costaba hasta el doble de
   * espera, y en pantalla se veía como si la víbora frenara para doblar.
   *
   * Ahora el único que reprograma el reloj es el propio paso. Girar cambia
   * hacia dónde va el paso que ya venía, sin tocar cuándo llega.
   *
   * `setTimeout` encadenado y no `setInterval`: la velocidad cambia con cada
   * fruta y un intervalo fijo no la seguiría. No es `requestAnimationFrame`
   * porque esto avanza por casillas y no por píxeles — el deslizamiento entre
   * casilla y casilla lo hace el navegador con una transición de CSS, que corre
   * en el compositor y no cuesta un cuadro de JavaScript.
   */
  useEffect(() => {
    if (!module || !started || paused || !playing) return;

    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      const current = boardRef.current;
      if (current === null) return;

      const value = module.engine.tick(current.value);
      const next = { round: current.round, value };
      // Sincrónico: el próximo paso se agenda ya mismo y tiene que ver ESTE
      // tablero, no el que React todavía no renderizó.
      boardRef.current = next;
      setBoard(next);

      timer = setTimeout(step, module.engine.tickMs(value));
    };

    const first = boardRef.current;
    timer = setTimeout(step, module.engine.tickMs(first === null ? undefined : first.value));

    return () => {
      clearTimeout(timer);
    };
  }, [module, started, paused, playing]);

  /*
   * La pantalla se apaga, la partida se pausa.
   *
   * Sin esto, dejar el teléfono un segundo es perder: el reloj sigue corriendo
   * en segundo plano (o peor, el navegador lo estrangula y vuelve a los saltos).
   * Pausar es lo único honesto.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') setPausedRound(roundRef.current);
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, []);

  // Se anota una vez por partida y nada más. No hay sesión que limpiar porque
  // nunca se guardó una: un arcade no se reanuda.
  useEffect(() => {
    if (!module || !ready || playing || !started) return;
    if (recorded.current === round) return;
    recorded.current = round;

    void storage.recordResult(module.meta.id, {
      schemaVersion: SCHEMA_VERSION,
      gameId: module.meta.id,
      difficulty,
      outcome: status.kind === 'won' ? 'won' : 'lost',
      elapsedMs: performance.now() - startedAt.current,
      finishedAt: Date.now(),
    });
  }, [module, ready, playing, started, status.kind, round, difficulty, storage]);

  const start = useCallback(() => {
    startedAt.current = performance.now();
    setStartedRound(round);
    setPausedRound(null);
  }, [round]);

  const dispatch = useCallback(
    (move: unknown) => {
      if (!module || !started || paused || !playing) return;
      const current = boardRef.current;
      if (current === null) return;

      const next = { round: current.round, value: module.engine.applyMove(current.value, move) };
      boardRef.current = next;
      setBoard(next);
    },
    [module, started, paused, playing]
  );

  const restart = useCallback(() => {
    setSeed(freshSeed());
  }, []);

  const pause = useCallback(() => {
    setPausedRound(round);
  }, [round]);

  const resume = useCallback(() => {
    setPausedRound(null);
  }, []);

  const chooseDifficulty = useCallback(
    (next: Difficulty) => {
      if (next === difficulty) return;
      setDifficulty(next);
      if (module) void storage.saveDifficulty(module.meta.id, next);
    },
    [difficulty, module, storage]
  );

  return {
    phase: error ? 'error' : ready ? 'ready' : 'loading',
    error,
    module,
    state,
    status,
    progress: ready && module ? Math.min(1, Math.max(0, module.engine.getProgress(state))) : 0,
    difficulty,
    stepMs,
    started,
    paused,
    roundId: round,
    start,
    pause: pause,
    resume: resume,
    restart,
    dispatch,
    setDifficulty: chooseDifficulty,
  };
}
