# 🗺️ Cerebrix — Plan de Construcción

> Documento vivo. Es la hoja de ruta oficial del proyecto.
> Complementos: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (los valores) · [`STYLING.md`](./STYLING.md) (dónde vive cada regla CSS) · [`GAME_CONTRACT.md`](./GAME_CONTRACT.md) (la interfaz técnica).

---

## 📌 Qué cambió respecto del plan original (y por qué)

El plan de partida era correcto en su tesis central: **el contrato primero, los juegos después**. Estos son los ajustes:

| #   | Cambio                                                                                                                       | Razón                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`render` sale de la interfaz del motor.** El contrato se parte en `engine` (lógica pura, sin React) + `View` (componente). | Si `render` vive en la misma interfaz que `validate`, el motor queda casado con el framework. Separados, la lógica se testea sin DOM, corre en un Web Worker y sobrevive a un cambio de UI. Es la mejora estructural más importante.                                          |
| 2   | **Los tokens de diseño se crean en Fase 1, no en Fase 2.**                                                                   | El shell necesita _algún_ color desde el minuto uno. Se crean los tokens (10 min de trabajo) y el shell los consume desde el principio; la Fase 2 construye los componentes y el estilo real sobre esa base ya conectada. Evita reescribir el shell entero.                   |
| 3   | **Persistencia con `schemaVersion` y migraciones desde el día 1.**                                                           | El original guarda estado sin versionar. La primera vez que cambies la forma del estado de Sudoku, todas las partidas guardadas de tus usuarios revientan. Un campo `schemaVersion` + una tabla de migraciones cuesta 20 líneas ahora y es imposible de retrofittear después. |
| 4   | **Autosave por evento, no por intervalo.** Se guarda con debounce tras cada jugada **y** en `visibilitychange`.              | En móvil el sistema mata la pestaña sin avisar. Un `setInterval` de 10s pierde las últimas jugadas; `visibilitychange` es el único evento confiable.                                                                                                                          |
| 5   | **Generación de Sudoku en Web Worker.**                                                                                      | El backtracking con verificación de unicidad puede tardar segundos en un móvil de gama media. En el hilo principal congela la UI y arruina el "super fluido".                                                                                                                 |
| 6   | **Fase 7 nueva: pulido, PWA y presupuesto de performance.**                                                                  | El plan original terminaba en "dos juegos corriendo". Falta el trabajo que hace que se sienta bien en el transporte: offline, instalable, y medición real de FPS en un dispositivo lento.                                                                                     |
| 7   | **Cada fase tiene criterios de aceptación verificables**, no solo un hito narrativo.                                         | "Hito: el shell carga cualquier plugin" es una intención. "El test `registry.test.ts` monta un módulo falso sin que `/core` lo importe" es una verificación.                                                                                                                  |
| 8   | **`/core` no importa de `/games` — con un lint que lo hace fallar.**                                                         | La regla del plan original es la correcta, pero una regla que no está automatizada se rompe a las tres semanas. Se enforcea con `eslint-plugin-boundaries` en CI.                                                                                                             |

---

## 🧱 Decisiones base (cerradas)

| Decisión             | Elección                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Framework**        | React 19 + TypeScript (`strict`)                                                                                       |
| **Bundler**          | Vite 8                                                                                                                 |
| **Estado del shell** | Zustand (~1 kB). El estado _del juego_ vive en su engine, no acá.                                                      |
| **Estilos**          | CSS Modules + custom properties. Sin Tailwind: el design system se define en tokens y no quiero dos fuentes de verdad. |
| **Router**           | React Router v7 (`createBrowserRouter` + `lazy`)                                                                       |
| **Persistencia**     | IndexedDB vía `idb`, detrás de una interfaz propia                                                                     |
| **Tests**            | Vitest (lógica) + Testing Library (componentes) + Playwright (E2E, desde Fase 6)                                       |
| **Sprites**          | SVG inline animado con CSS (ver `DESIGN_SYSTEM.md` §6)                                                                 |
| **Backend**          | Ninguno en v1. La capa `/storage` deja la puerta abierta.                                                              |
| **Deploy**           | Sitio estático (Vercel / Netlify / GitHub Pages)                                                                       |

### Estructura de carpetas

```
cerebrix/
├── docs/                       # PLAN · DESIGN_SYSTEM · GAME_CONTRACT
├── public/
├── src/
│   ├── core/                   # ⛔ NUNCA importa de /games ni de /design/sprites de un juego
│   │   ├── contract.ts         # Tipos del contrato de juego
│   │   ├── registry.ts         # Manifiesto: id → () => import(...)
│   │   ├── difficulty.ts       # Escala 1–5 compartida
│   │   ├── router.tsx
│   │   ├── shell/              # AppShell, GameFrame, Home
│   │   └── hooks/              # useGameSession, useAutosave, usePrefetch
│   ├── design/                 # Tokens + componentes + animaciones + sprites comunes
│   │   ├── tokens/             # palette.css · theme.css · space.css · motion.css
│   │   ├── animations.css
│   │   ├── components/
│   │   └── sprites/
│   ├── storage/                # Interfaz + driver IndexedDB + migraciones
│   ├── games/
│   │   ├── _dummy/             # Juego de prueba del contrato (se conserva: es un test vivo)
│   │   ├── sudoku/
│   │   │   ├── index.ts        # export default: GameModule
│   │   │   ├── engine/         # Lógica pura. Cero imports de React.
│   │   │   ├── view/           # Componentes
│   │   │   ├── sprites/
│   │   │   ├── data/           # Puzzles pregenerados por dificultad
│   │   │   └── workers/        # generator.worker.ts
│   │   └── minesweeper/
│   └── main.tsx
└── tests/
```

**Reglas de frontera (enforcadas por ESLint, no por buena voluntad):**

1. `/games/<a>` **no** puede importar de `/games/<b>`.
2. `/core` **no** puede importar de `/games/*`. Solo conoce `registry.ts`, que contiene funciones `import()` perezosas.
3. `/games/*/engine` **no** puede importar de React ni de `/design`. Lógica pura y punto.
4. `/design` **no** importa de `/core` ni de `/games`. Es la capa más baja.

---

## Fase 0 — Andamiaje 🏗️

**Objetivo:** que `npm run dev` levante una página en blanco con todo el tooling puesto.

- [x] Vite 8 + React 19 + TypeScript
- [x] TypeScript en `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- [x] Alias de paths: `@core`, `@design`, `@games`, `@storage`
- [x] ESLint + Prettier + `eslint-plugin-boundaries` con las 4 reglas de frontera
- [x] Stylelint con las reglas de [`STYLING.md`](./STYLING.md) §8 (cero hex, cero `--raw-*`, cero `!important`)
- [x] Capas CSS `@layer tokens, base, components, game, overrides` declaradas
- [x] Vitest + Testing Library, con tests que verifican las reglas de frontera
- [x] Husky + lint-staged (lint + format en pre-commit)
- [x] GitHub Actions: audit → typecheck → lint → format → test → build
- [x] Endurecimiento de cadena de suministro: `ignore-scripts=true` en `.npmrc`, `npm ci --ignore-scripts` en CI, `npm audit --audit-level=high`, lockfile versionado
- [x] `.gitignore`, `README.md`, `docs/`

**✅ Aceptación — cumplida.** `tests/boundaries.test.ts` verifica que estos cinco imports ilegales rompen el lint:

| Import ilegal             | Regla                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| `/core` → `@games/sudoku` | El registro es el único que nombra juegos, y con `import()` perezoso |
| juego A → juego B         | Los juegos no se conocen entre sí                                    |
| `engine/` → `react`       | El motor es lógica pura                                              |
| `engine/` → `@design/*`   | El motor no conoce la UI                                             |
| `/design` → `@core/*`     | `/design` es la capa más baja                                        |

> Durante esta fase la config de `boundaries` estuvo mal escrita **dos veces** y el lint pasó en verde igual. De ahí el test: una regla de arquitectura que nunca dispara es peor que no tenerla, porque da confianza falsa.
>
> Y el propio test cayó en la misma trampa una tercera vez: llamaba a `lintFiles()` una vez por caso, pero typescript-eslint construye el `Program` en la primera llamada y lo cachea, así que los fixtures escritos después no existían para el parser. El `Parsing error` resultante **reemplaza** el mensaje de la regla — los casos negativos fallaban y el caso positivo (`not.toMatch`) pasaba por el motivo equivocado. Ahora todos los fixtures se escriben antes del primer lint, se lintean en una sola pasada, y **cada caso asserta explícitamente que no hubo `Parsing error`**. Sin esa aserción, este modo de fallo puede volver a disfrazarse de verde.

**Estado del build:** bundle inicial **60.5 kB gzip** (presupuesto: 120 kB).

---

## Fase 1 — Contrato + shell vacío 📐

**Objetivo:** un esqueleto que carga juegos que no conoce.

- [x] `core/contract.ts` — tipos completos (ver [`GAME_CONTRACT.md`](./GAME_CONTRACT.md))
- [x] `core/registry.ts` — manifiesto con metadata + loader perezoso
- [x] Tokens mínimos de `design/tokens/` conectados (colores, espaciado, motion)
- [x] `AppShell`: header (timer + dificultad) / área central / footer de acciones
- [x] `Home`: grid de tarjetas leído **del registro**, nunca hardcodeado
- [x] Router con `lazy` + `Suspense` + un `<Skeleton>` de fallback
- [x] `games/_dummy/` — botón "Ganar", implementa el contrato completo

**✅ Aceptación — cumplida.** Verificada por tests, no por inspección:

| Criterio                                                     | Dónde se verifica                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Se juega el dummy desde Home                                 | `tests/shell.test.tsx` — navega, juega, deshace y gana en el router |
| `grep -r "games/" src/core/` devuelve **solo** `registry.ts` | `tests/architecture.test.ts` — escanea `/core` entero               |
| Un juego nuevo aparece en Home sin tocar ningún otro archivo | `tests/registry.test.tsx` — inyecta una entrada inventada           |
| `preview` del registro no se desincroniza del `meta` real    | `tests/registry.test.tsx` — compara contra el módulo cargado        |
| El motor se testea sin DOM ni renderer                       | `tests/dummyEngine.test.ts` — pureza, round-trip, rechazo, pista    |

### Decisiones que tomó esta fase

**`defineGame()` — el único cast del repo.** El shell guarda módulos cuyos tipos no puede nombrar. Borrarlos a `unknown` funciona para el motor (los métodos son bivariantes en sus parámetros) pero **no** para `View`: las props de un componente están en posición contravariante, así que ningún truco de varianza hace que `GameModule<SudokuState, …>` sea asignable a `GameModule<unknown, …>`. En vez de esparcir `any` por el shell, el borrado ocurre **una sola vez**, en `defineGame()`. Adentro de cada juego los tipos son completos y reales; afuera el shell es ciego a propósito.

**El estado de la sesión es derivado, no reseteado.** Al cambiar de dificultad o empezar de nuevo, la pila de deshacer, el rechazo y la pista no se limpian con `setState` dentro de un efecto — cada uno lleva la identidad de su ronda y se ignora si no coincide. Un `setState` sincrónico en un efecto encadena renders para nada, y el lint de React lo marca como error.

**El timer no re-renderiza el árbol.** Su tick vive en un `rAF` que escribe `textContent` y solo cuando el string cambia. Un `setState` por segundo volvería a renderizar el tablero entero por un dígito cosmético.

**Estado del build:** inicial **95.5 kB gzip** (91.7 JS + 3.7 CSS; presupuesto 120 kB) · chunk del dummy **1.9 kB gzip** (presupuesto 60 kB). La subida desde los 60.5 kB de la Fase 0 es React Router. El shell del juego (`GameRoute`) también está code-splitteado: quien solo mira Home no lo descarga.

---

## Fase 2 — Design system 🎨

**Objetivo:** que el dummy ya se vea "de la familia" y que un token repinte todo.

Referencia normativa completa: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).

- [x] Tokens completos: color (dark + light), tipografía, espaciado, radios, sombras, motion
- [x] `animations.css` con el catálogo estándar (§5.3)
- [x] Componentes base: `Button`, `IconButton`, `Cell`, `Grid`, `Timer`, `Badge`, `DifficultyPicker`, `Modal`, `Toast`, `Skeleton`, `StatTile` — más `ProgressBar` y `EmptyState`
- [x] Secuencia de entrada animada de la Home (§5.4)
- [x] Sprites compartidos: `LogoCerebrix`, `Trophy`, `Streak`, `Clock`
- [x] Toggle de tema (dark/light) + script anti-FOUC en `<head>`
- [x] Toggle "Reducir animaciones" + soporte de `prefers-reduced-motion`
- [x] Layout responsive: barra de acciones fija abajo en móvil, `dvh`, `safe-area-inset`

**✅ Aceptación:**

| Criterio                                                  | Estado                                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Cambiar `--raw-violet-600` repinta acentos en toda la app | ✅ `tests/tokens.test.ts` verifica que la cadena token → paleta no esté cortada                                                            |
| Ruta que muestra todos los componentes en sus estados     | ✅ `/kitchen-sink`, lazy — `tests/design.test.tsx` la monta entera                                                                         |
| Nada se rompe con las animaciones desactivadas            | ✅ Ambos canales (OS y toggle propio) verificados en test; todo estado final es correcto sin animación                                     |
| Nada se rompe a 360px de ancho                            | ⚠️ **Sin verificar visualmente.** El CSS es mobile-first con `dvh` y `safe-area-inset`, pero falta una mirada real en un viewport de 360px |

> `press` y `lift` del catálogo (§5.3) no son `@keyframes`: son transiciones de `:active` y `:hover` en `Button`, `IconButton` y `Cell`. Un keyframe para un estado que el navegador ya mantiene sería peor — se pelearía con el estado real del elemento.

### Decisiones que tomó esta fase

**`<Modal>` sobre `<dialog>` nativo.** La trampa de foco, `Esc`, la inercia de la página de atrás y el top layer los da la plataforma. Un modal hecho a mano se equivoca en al menos uno de esos cuatro. El costo: jsdom 30 no implementa **ningún** método de `<dialog>`, así que `tests/setup.ts` los stubea. Consecuencia honesta: los tests cubren abrir, cerrar y que todo cierre pase por un solo handler — **`Esc`, la trampa de foco y la inercia no están cubiertas** y quedan para la auditoría de teclado de la Fase 7.

**El desenlace se anuncia una sola vez.** Al terminar la partida, el estado no se repite en la región `aria-live`: el nombre accesible del modal ya lo anuncia al abrirse. Tenerlo en los dos lados hacía que un lector de pantalla leyera la victoria dos veces.

**`<Cell>` con `memo` obligatorio.** Un tablero experto de Buscaminas son ~480 celdas; sin `memo` cada jugada re-renderiza las 480. El área táctil de 44px la agrega un pseudo-elemento centrado, no padding: el padding deformaría la geometría del grid.

**`<Grid>` no asume tablero cuadrado.** `rows` puede diferir de `cols` desde el día uno — es justo el supuesto que la Fase 6 existe para romper, y romperlo ahora cuesta una línea.

**La secuencia de entrada corre una vez por sesión** (`sessionStorage`). Volver a Home desde un juego usa `view-in`. Una animación que ya viste es latencia.

**El acento son dos tokens, no uno** _(corrección posterior, al mirar la app corriendo)_. El violeta hacía dos trabajos que tiran para lados opuestos: leerse **como** color sobre el fondo casi negro (logo, iconos, texto de badges) y servir **de** fondo bajo texto blanco (botón primario, dificultad elegida). Más brillante mejora el primero y arruina el segundo. Con un solo valor, `--raw-violet-500` daba **4.46:1** como frente y **4.23:1** bajo blanco: fallaba el mínimo AA de §2.3 **en las dos direcciones a la vez**. Separado en `--c-accent` (violet-400, 6.93:1) y `--c-accent-surface` (violet-600, 5.33:1 bajo blanco), cada lado pasa cómodo. En el tema claro los dos trabajos coinciden en violet-600 — por eso ese tema ya se veía definido y el oscuro no. `tests/tokens.test.ts` calcula el contraste desde los tokens y lo deja fijado.

**Estado del build:** inicial **97.5 kB gzip** (93.2 JS + 4.3 CSS; presupuesto 120 kB). `KitchenSink` y `GameRoute` van en chunks aparte.

---

## Fase 3 — Persistencia 💾

**Objetivo:** cerrar la pestaña y volver exactamente donde estabas.

```ts
interface StorageDriver {
  saveSession(gameId: string, session: SavedSession): Promise<void>;
  loadSession(gameId: string): Promise<SavedSession | null>;
  clearSession(gameId: string): Promise<void>;
  recordResult(gameId: string, result: GameResult): Promise<void>;
  getStats(gameId: string): Promise<GameStats>;
  getGlobalStats(): Promise<GlobalStats>;
  exportAll(): Promise<string>; // JSON — backup del usuario
  importAll(json: string): Promise<void>;
}
```

- [x] Interfaz + driver IndexedDB (`idb`), con fallback a `localStorage`
- [x] `schemaVersion` en cada registro + tabla de migraciones
- [x] `useAutosave`: debounce 400ms tras cada jugada + flush en `visibilitychange` y `pagehide`
- [x] Estadísticas: partidas, completadas, % éxito, tiempo total, mejor tiempo **por dificultad**, racha actual, racha máxima
- [x] "Continuar partida" en la tarjeta de Home cuando hay sesión guardada
- [x] Exportar/importar como archivo JSON

> La interfaz creció dos miembros respecto del boceto: `listSessions()`, para que Home sepa qué juegos tienen algo que continuar en un solo viaje en vez de uno por juego, y `kind`, para poder afirmar en un diagnóstico qué implementación terminó corriendo.

**✅ Aceptación:**

| Criterio                                                       | Estado                                                                                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Matás la pestaña y reabrís → estado exacto, **timer incluido** | ✅ `tests/persistence.test.tsx` desmonta el árbol sin aviso y lo vuelve a montar; el reloj retoma en `01:05` desde una sesión guardada |
| Un registro viejo migra a la versión actual sin pérdida        | ⚠️ **El runner sí, la tabla está vacía.** Ver abajo                                                                                    |
| El flush ocurre sin esperar el debounce                        | ✅ Test que dispara `visibilitychange` y verifica que se guardó igual                                                                  |
| Un backup corrupto no destruye lo guardado                     | ✅ Test que importa basura y comprueba que la sesión anterior sigue ahí                                                                |

**Sobre la migración:** el criterio pedía migrar un registro `schemaVersion: 1` a la versión actual — pero la forma del registro **no cambió todavía**, así que la tabla real está vacía y esa migración no existe. Inventar una falsa para que el test pase de verde sería mentir. Lo que se construyó y se testea es el **runner**: salta de versión en versión, se ejercita con una cadena sintética de v1 → v3, y **rechaza** tanto un registro del futuro como una cadena con un salto faltante, en vez de leerlo optimistamente y perder campos en silencio. Es la máquina donde la primera migración real se enchufa sin tocar nada más.

### Decisiones que tomó esta fase

**Las estadísticas se derivan del log de resultados, nunca se guardan al lado.** Un agregado corriendo junto al log son dos fuentes de verdad que divergen la primera vez que una escritura falla a medias, y después no hay forma de saber cuál tiene razón. Recomputar es barato a este volumen; si el log crece demasiado, la solución es compactar resultados viejos, no duplicar los totales.

**"Racha" significa victorias consecutivas**, cortadas por una derrota — no días jugados. Es la lectura que encaja con el resto de la lista (partidas, completadas, % éxito) y la que hace que la llama del sprite se apague al llegar a cero.

**Una sesión ilegible se descarta, un backup ilegible se rechaza.** Son casos opuestos a propósito: un autosave corrupto que no se puede leer deja al jugador trabado en ese juego para siempre, así que se borra; un archivo de importación inválido se valida **entero antes del primer borrado**, porque importar a medias sobre el historial de alguien no tiene vuelta atrás.

**`schemaVersion` del registro ≠ `stateVersion` del juego.** El primero es de esta capa y versiona la forma del sobre; el segundo es del juego, viaja adentro, y se le pasa a `engine.deserialize` para que migre su propia forma. Separados, cambiar el estado de Sudoku no obliga a migrar los registros de Buscaminas.

**Los object stores no se versionan con el registro.** Cambiar la forma de un registro no fuerza un bump de versión de IndexedDB ni el upgrade bloqueado que eso provoca cuando hay otra pestaña abierta.

### Verificación

Los dos drivers pasan **la misma suite de contrato**: el fallback no es un camino de segunda, lo recibe cualquier navegador en modo privado, y una divergencia entre ambos es justo el bug que solo le aparece a los usuarios con menos manera de reportarlo. Requirió agregar `fake-indexeddb` como dependencia de desarrollo — jsdom no trae IndexedDB, y sin eso el driver principal quedaba sin un solo test.

Los tests de persistencia a nivel shell corren contra el fallback de `localStorage`, que es lo que jsdom permite. Lo que ejercitan es **el uso que el shell hace del storage**, no una implementación en particular.

**Estado del build:** inicial **102.6 kB gzip** (97.6 JS + 5.0 CSS; presupuesto 120 kB). `idb` es la mayor parte de la subida. Queda margen, pero es el momento de mirarlo en cada fase.

---

## Fase 4 — Dificultad unificada 🎚️

**Objetivo:** un selector idéntico en todos los juegos; cada juego decide qué significa.

```ts
type Difficulty = 1 | 2 | 3 | 4 | 5;
// 1 Fácil · 2 Casual · 3 Normal · 4 Difícil · 5 Experto
```

- [x] `core/difficulty.ts`: escala, etiquetas, colores por nivel (tokens)
- [x] `getDifficultyConfig(d)` en cada engine → su configuración interna _(ya estaba desde la Fase 1)_
- [x] `<DifficultyPicker>` conectado al registro: solo muestra las dificultades que el juego declara en su metadata _(ya estaba desde la Fase 1)_
- [x] La dificultad elegida persiste **por juego**
- [x] Cambiar dificultad a mitad de partida pide confirmación

**✅ Aceptación — cumplida.** El dummy declara `[1,3,5]` y el picker muestra exactamente esos tres, sin una línea del dummy en el shell (`tests/shell.test.tsx`). `tests/difficulty.test.tsx` cubre el resto: confirmación, cancelación, reconstrucción y persistencia.

### Decisiones que tomó esta fase

**La confirmación solo aparece cuando hay algo que perder.** Un tablero que nadie tocó no cuesta nada de reconstruir, así que preguntar ahí es fricción pura. La condición es que haya jugadas en la pila de deshacer y la partida siga en curso.

**La preferencia vive fuera de la sesión.** Guardar la dificultad dentro de `SavedSession` habría sido gratis, pero la sesión se borra apenas termina la partida — y entonces el jugador volvería al nivel por defecto después de cada victoria. Va en un registro aparte (`preferences`), que sobrevive al borrado. Hay un test que lo fija justamente así: guardar sesión, terminarla, y verificar que el nivel sigue.

**Si la sesión guardada y la preferencia no coinciden, gana la sesión.** Son dos fuentes con distinta autoridad: la preferencia dice "en qué nivel te gusta jugar", la sesión dice "en qué nivel está el tablero que dejaste a medias". Continuar el tablero es lo que el jugador espera.

**`asDifficulty()` narrowea lo que vuelve de storage.** `/storage` no puede importar `/core`, así que devuelve un `number` pelado. Sin ese chequeo, un nivel guardado por una versión donde el juego soportaba más dificultades reviviría un nivel que el juego ya no declara.

**El color del nivel tiñe, no rellena.** Cinco chips rellenos con cinco tonos saturados romperían el tope de dos colores saturados a la vez de DESIGN_SYSTEM.md §1. El estado elegido lo carga el fondo y el peso, no el tono solo. Los cinco tokens `--c-difficulty-*` reusan los semánticos existentes en vez de inventar cinco tonos nuevos, así heredan su contraste y su comportamiento entre temas.

**La base de IndexedDB sube a la versión 2** para agregar el store `preferences`. El guard `if (!contains(...))` hace que la misma función de upgrade sirva tanto para una base nueva como para una que viene de la v1 con partidas adentro. El `Backup` gana `preferences` de forma aditiva y opcional: un export escrito antes de que existieran sigue importándose, y hay un test que lo verifica.

**Estado del build:** inicial **103.0 kB gzip** (97.9 JS + 5.1 CSS; presupuesto 120 kB).

---

## Fase 5 — Sudoku 🔢

**Objetivo:** el primer juego real, cumpliendo el contrato sin modificarlo.

**5a — Jugable con puzzles pregenerados**

- [x] `data/puzzles-{1..5}.json` (50 por dificultad), importados dinámicamente
- [x] Engine puro: `createInitialState`, `applyMove`, `validate`, `checkStatus`, `serialize`, `deserialize`
- [x] Vista: grid 9×9 con líneas de bloque, selección, resaltado de pares (fila/columna/caja), resaltado del mismo número
- [x] Teclado numérico táctil + soporte de teclado físico + flechas
- [x] Modo lápiz (anotaciones), borrar — **`rehacer` no**, ver hallazgos
- [x] Detección de conflictos con `--c-cell-error`; el `shake` quedó para las jugadas ilegales, ver decisiones
- [x] Victoria: `win-burst` + guardado de resultado

**5b — Generador propio**

- [ ] Backtracking con orden aleatorio + poda por unicidad de solución
- [ ] Calibración de dificultad por técnicas requeridas (naked single, hidden single, pointing pair…), no solo por celdas vacías
- [ ] Corre en `generator.worker.ts`; la UI muestra progreso y **nunca** se congela
- [ ] Pre-generación de la siguiente partida en idle (`requestIdleCallback`)

**✅ Aceptación:**

| Criterio                                                                   | Estado                                                                                                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sudoku jugable, guardable, con dificultad, **con cero cambios en `/core`** | ✅ **El diff entero de `/core` son 14 líneas en `registry.ts`**: la entrada del registro. Ni el contrato, ni el shell, ni la sesión, ni el router |
| Tests del engine: unicidad, conflictos, round-trip                         | ✅ `tests/sudokuEngine.test.ts` — 22 casos, sin DOM ni renderer                                                                                   |
| 60fps con throttling 4× en un móvil emulado                                | ⚠️ **Sin medir.** Requiere DevTools en un navegador real                                                                                          |

**Lo que dice el primer criterio:** la arquitectura funciona. Un juego real, con 81 celdas, teclado, anotaciones, puzzles propios y persistencia, entró sin que `/core` supiera que existe.

### Decisiones que tomó esta fase

**Un dígito en conflicto se escribe y se marca en rojo; no se bloquea.** El plan pedía `shake` + `--c-cell-error` para los conflictos, lo que sugiere rechazarlos. Rechazarlos convierte al juego en un detector de errores gratis: el jugador prueba un número y el tablero le dice si estaba bien. Sudoku es deducción; equivocarse y darse cuenta es el juego. Así que el conflicto es un **estado derivado del tablero** que la vista pinta con `--c-cell-error`, y el `shake` queda para las jugadas genuinamente ilegales — tocar una pista. Efecto lateral valioso: los conflictos viven en el estado, así que la vista los calcula sola y no hizo falta tocar el contrato.

**Completo no es correcto.** Como los conflictos se permiten, un tablero lleno puede estar mal. `checkStatus` compara contra la solución única en vez de conformarse con que no queden huecos.

**Escribir dos veces el mismo dígito lo borra.** Una tecla hace poner y quitar, que en móvil es la diferencia entre una pulsación y buscar el botón de borrar.

**Colocar un dígito retira esa anotación de sus 20 pares.** Hacerlo a mano es exactamente la tedio que el modo lápiz existe para evitar, y como deshacer restaura estados enteros, ser servicial acá no cuesta nada.

**El puzzle se elige por hash del seed.** El mismo seed da el mismo tablero, que es lo que el puzzle diario del backlog va a necesitar sin cambiar nada.

**`game-data` es un elemento de frontera nuevo.** El motor tenía que leer `data/puzzles-N.json`, y la regla lo marcó como _engine → game_. La regla tenía razón en preguntar: la respuesta fue afinarla, no aflojarla. Permitir "el motor puede importar su juego" le habría abierto la puerta a `view/` y a React por la ventana de atrás. Ahora existe `game-data`, y el motor puede leer sus datos y nada más.

### 🔎 Tres huecos del contrato que esta fase destapó

Ninguno se parcheó por cuenta propia — van a la revisión de contrato de la Fase 6, que es donde el plan dice que corresponde.

1. **`ValidationResult.cells` no tiene por dónde llegar a la vista.** El contrato lo documenta como "celdas a resaltar en rojo", pero `GameViewProps` no lleva el rechazo: el shell sabe qué celdas señalar y no tiene cómo decírselo a quien las dibuja. Acá no dolió porque los conflictos terminaron viviendo en el estado, pero el campo hoy no sirve para lo que promete.

2. **`GameAction.toggle` está declarado y es inusable.** El shell puede dibujar la acción activa, pero la vista no puede leer ese estado, así que un toggle en la barra se encendería sin cambiar lo que hace tocar una celda. Por eso el modo lápiz vive en el teclado numérico — que además es donde el dedo ya está.

3. **No existe `rehacer`.** Según `GAME_CONTRACT.md` §5 deshacer/rehacer son del shell, no del juego, así que agregarlo es tocar `/core`. Se dejó afuera a propósito para no contaminar el diff con el que se verifica el criterio de aceptación de esta fase. Es un hueco del shell, no del contrato.

**Estado del build:** inicial **95.5 kB gzip** (bajó al reacomodarse los chunks). Sudoku: **4.0 kB gzip** de código + **3.9 kB** del archivo de puzzles de la dificultad que se juegue — 8 kB contra un presupuesto de 60.

---

## Fase 6 — Buscaminas: la prueba de fuego 💣

**Objetivo:** validar que la arquitectura aguanta un juego de naturaleza distinta.

Buscaminas antes que Solitario a propósito: comparte el modelo de grid (reusa `<Cell>` y `<Grid>`) pero rompe supuestos que Sudoku no rompía — tablero no cuadrado, estado oculto, condición de derrota, interacción secundaria (bandera).

- [ ] Engine: generación con primer click seguro, flood fill, conteo de vecinos
- [ ] Vista: long-press = bandera en móvil, click derecho en desktop, chording
- [ ] Cascada de revelado con `reveal-wave` (delay por distancia, topeado)
- [ ] Sprites `Mine` y `Flag` animados
- [ ] Contador de minas restantes

**✅ Aceptación (la que importa):**

- Si entró **sin tocar `/core`** → la arquitectura sirve, se sigue.
- Si hubo que tocar `/core` → **se para y se refactoriza el contrato ahora**. Con dos juegos cuesta una tarde; con cinco, una semana. Documentar qué supuesto falló.

---

## Fase 7 — Pulido, offline y performance ⚡

**Objetivo:** que sirva de verdad en el subte, sin señal y con una mano.

- [x] PWA: manifest, íconos, service worker (Workbox), instalable
- [ ] Offline completo — no hay backend, no hay excusa
- [ ] Vista de estadísticas y logros (lazy)
- [ ] Presupuestos verificados en CI: bundle inicial ≤ 120 kB gzip, cada juego ≤ 60 kB
- [ ] Lighthouse móvil ≥ 90 en Performance y Accessibility
- [ ] Profiling real con throttling 4×: sin frames largos al navegar el tablero
- [ ] Auditoría de teclado y lector de pantalla
- [ ] E2E con Playwright: jugar y ganar cada juego, recargar y resumir

---

## Fase 8 — Nonograma 🖌️

**Objetivo:** el tercer juego, y la primera vez que uno entra sin que se discuta la arquitectura.

- [x] Motor puro: pistas, solucionador por líneas, generador
- [x] Vista con canaletas de pistas alrededor del tablero
- [x] Modos «Pintar» y «Descartar», más pulsación larga y clic derecho
- [x] Pista deducida del propio tablero del jugador

**Lo que sí tocó `/core`, y por qué.** `GameMeta` ganó `examples`. No es un parche
al shell: `howToPlay` es texto, y hay reglas — qué significa `3 1`, por qué el
solapamiento obliga una casilla — que en prosa no se entienden y dibujadas sí.
Es un hueco del contrato, no del juego, y lo van a usar Tango, Queens y Zip
igual. Los pasos además pasaron a numerarse, porque son pasos.

**Ningún tablero pide adivinar.** El generador dibuja una figura al azar, le lee
las pistas, y la acepta **solo si esas pistas la reconstruyen razonando línea por
línea**. Rechazar en vez de reparar: una figura reparada deja de ser azarosa de
maneras que se notan. Medido: aceptación inmediata en las cinco dificultades,
0.1 ms por tablero en 5×5 y 6.3 ms en 15×15, así que no hace falta worker.

**Las canaletas usan pistas más angostas que el tablero.** Un número no es un
cuadrado. En 15×15 la canaleta llega a siete columnas, y dárselas cuadradas se
come un tercio de la pantalla. Las columnas del tablero quedan en `1fr` y se
comen lo que la canaleta devuelve.

**Un cuadrado equivocado no se marca.** Igual que los conflictos de Sudoku no se
bloquean: darse cuenta de que una línea no cierra, y volver atrás, es el juego.
Lo que sí se atenúa son los números de una línea cuando lo pintado coincide con
ellos — y eso sale del tablero del jugador, no de la solución.

**Se pinta arrastrando, y un trazo es un solo movimiento.** `<Cell>` ganó
`onPointerEnter`. El detalle que lo hace funcionar en el celular: en un toque el
navegador captura el puntero en la casilla donde empezó, así que hay que soltar
esa captura en `pointerdown` o el arrastre reporta siempre la misma casilla. El
trazo se dibuja en la vista y se despacha entero al levantar el dedo — si no,
deshacer un arrastre de ocho casillas serían ocho toques.

**Esquinas rectas en el tablero.** El redondeo por defecto dejaba un rombo blanco
donde se tocaban cuatro casillas pintadas, y una tira sólida se leía como cuatro
manchas sueltas. Ver la tira es contarla.

**Tamaños 3×3 a 12×12.** 15×15 era demasiado hasta en escritorio, y la canaleta
de pistas se comía siete columnas. Con 12×12 el máximo son 18 columnas.

---

## 🎯 Orden mental

```
Andamiaje → Contrato → Shell → Design → Storage → Dificultad → Sudoku → Buscaminas → Pulido
└────────── el esqueleto que funciona vacío ──────────┘ └──── lo llenás con juegos ────┘
```

Las fases 0–4 se sienten como "no estoy haciendo un juego" y dan ansiedad. Ese es exactamente el trabajo que hace que el juego 3, 4 y 5 tomen días en vez de semanas.

**No te saltees al Sudoku antes de tener el contrato.**

---

## 🎮 Los próximos juegos

Estos seis los eligió Chris, en agosto de 2026, después de probarlos en otras
plataformas. El orden es de costo, no de gusto: los primeros no piden nada que
no exista ya.

| Juego          | Reusa tal cual                          | Lo único nuevo                          |
| -------------- | --------------------------------------- | --------------------------------------- |
| **Lights Out** | todo                                    | nada                                    |
| **Tango**      | grid, celda de 3 estados, deshacer      | los signos `=` y `×` **entre** casillas |
| **Queens**     | grid, `blockEdges`, `--cell-bg`         | tokens de color de región               |
| **Memoria**    | grid, el estado `covered` de Buscaminas | volteo de carta                         |
| **Zip**        | grid                                    | trazar un camino arrastrando            |
| **Flow**       | grid                                    | el mismo trazado que Zip                |

**Lights Out.** Sin riesgo técnico: el generador parte de un tablero apagado y
aplica K clics al azar, así que tiene solución por construcción, y la pista es
álgebra lineal en GF(2) que dice el clic exacto siguiente.

**Tango.** 6×6 fijo, así que resolverlo por fuerza bruta es instantáneo y generar
no tiene riesgo. Lo nuevo es que los signos no viven en una casilla sino en el
hueco entre dos: hay que agregarle a `<Grid>` una capa sobre las canaletas.

**Queens.** Reusa más de lo que parece: `blockEdges` en `<Cell>` ya es por celda,
así que los bordes de región salen de preguntar si el vecino es de otra región, y
`--cell-bg` ya existe como perilla. Todo el costo está en el generador: ubicar N
reinas que no se toquen ni en diagonal, hacer crecer N regiones desde ellas, y
verificar que la solución sea única.

**Memoria.** Hecho, y las dos decisiones que anticipaba salieron como estaban
previstas. `GameMeta` ganó `supportsUndo`: deshacer devolvería la carta pero no
te haría olvidar lo que viste. Y el par que no coincide se tapa solo con un
`setTimeout` en la vista, que despacha un movimiento común — el motor sigue sin
saber que existe el tiempo.

**El estado guarda qué cartas vio el jugador.** Es lo que permite que la pista
sea honesta: un juego de memoria tiene una pista tramposa («el par está allá»,
con información que el jugador no tiene) y una honesta, que es recordarle algo
que ya pasó por sus ojos. Sin registrar lo visto, solo se podía hacer trampa.

**Trazo (era «Zip»). Hecho, y Flow queda descartado.** Se eligió uno de los dos
porque son juegos distintos que comparten primitiva, y Trazo es el que sostiene
el estándar de la casa: su generador garantiza recorrido único y su pista cita
la regla. Flow, para tener soluciones únicas, obliga a curar niveles a mano —
trabajo de contenido, no de código — y su pista honesta se parece demasiado a la
respuesta. Nombre en español porque «zip» acá es un cierre o un archivo.

**La poda que lo hace posible.** Encontrar el primer recorrido siempre fue
barato; lo caro es demostrar que no hay un segundo, que es lo que exige la
unicidad. La comprobación de alcance no alcanza: hace falta contar los callejones
sin salida, porque final hay uno solo y en cuanto aparecen dos la rama está
muerta aunque todo siga comunicado. Medido con eso: 1 ms en 4×4, 13 ms en 5×5,
35 ms en 6×6. **Tope en 6×6** — de 7 en adelante el costo crece mucho más rápido
que la dificultad que aporta.

**Inversión compartida:** Tango, Queens y Zip necesitan lo mismo — generar,
contar soluciones, cortar en dos, reintentar. Nonograma y Sudoku ya lo hacen cada
uno por su lado. Conviene extraerlo antes del segundo de estos tres, no después
del tercero.

---

## 🕹️ Candidatos arcade

Lista de trabajo. **Casi todos son en tiempo real**, así que antes del primero
hay que decidir lo del modo _tick_ que se explica abajo. Las tres excepciones
están marcadas: encajan en el contrato tal como está hoy.

| Juego                      | Mecánica                                               | Categoría          | Partida  | Dev       |
| -------------------------- | ------------------------------------------------------ | ------------------ | -------- | --------- |
| **Simon** ✅ _(hecho)_     | Repetir la secuencia de luces que va creciendo         | REFLEJOS MEMORIA   | 1–5 min  | Muy fácil |
| **2048** ✅ _(hecho)_      | Deslizar números iguales para sumarlos                 | CASUAL DESLIZAR    | 3–15 min | Fácil     |
| **4 en línea** ✅          | Dejar caer fichas para alinear cuatro, contra la IA    | MESA RÁPIDO        | 2–5 min  | Fácil     |
| Snake                      | Moverse, comer y crecer sin chocar                     | ARCADE REFLEJOS    | 1–5 min  | Muy fácil |
| Golpea al topo             | Tocar rápido las casillas que se encienden             | REFLEJOS VELOCIDAD | 1–3 min  | Muy fácil |
| Torre de bloques           | Frenar el bloque justo encima del anterior             | PRECISIÓN CASUAL   | 1–3 min  | Muy fácil |
| Pong                       | Hacer rebotar la bola contra una IA                    | ARCADE DEPORTE     | 2–5 min  | Muy fácil |
| Rompebloques               | Rebotar la pelota con una barra para romper bloques    | ARCADE ACCIÓN      | 2–8 min  | Fácil     |
| Flappy                     | Tocar para mantenerse volando entre obstáculos         | AGILIDAD ACCIÓN    | 1–3 min  | Fácil     |
| Piano Tiles                | Tocar los bloques que caen antes de que lleguen abajo  | RITMO AGILIDAD     | 1–5 min  | Fácil     |
| Salto infinito             | Saltar sobre plataformas que aparecen más y más arriba | ARCADE HABILIDAD   | 2–6 min  | Media     |
| Asteroids / Space Invaders | Nave que dispara a figuras que caen                    | ACCIÓN DISPAROS    | 2–7 min  | Media     |
| Cambio de color            | Cruzar la pelota solo por los obstáculos de su color   | AGILIDAD PRECISIÓN | 1–4 min  | Media     |
| Cruzar la calle            | Avanzar paso a paso esquivando el tráfico              | HABILIDAD TIEMPO   | 2–6 min  | Media     |
| Pac-Man                    | Juntar puntos esquivando uno o dos enemigos            | ARCADE ACCIÓN      | 2–8 min  | Media     |

**2048. Hecho, y las tres decisiones que anticipaba salieron como estaban
previstas.** El azar vive **adentro del estado** — semilla más contador de
apariciones — porque `applyMove` tiene que ser pura: con `Math.random()` la
misma jugada deshecha y rehecha daría otro tablero y el guardado describiría una
partida distinta de la que se estaba jugando. La **dificultad mueve la meta**
(128 → 2048) y no el tamaño del tablero, que agrandado sería más fácil y diría
lo contrario de lo que promete. La escala arranca en 128 para que el primer
nivel se gane de entrada y termina en 2048, que es la partida clásica: el nivel
más alto es el juego que le da nombre, no uno inventado más allá. Y **no tiene pista**: `getHint` no está
declarado, su ausencia apaga el botón, y la única pista posible acá sería la
mejor dirección, o sea jugar en lugar del jugador.

**El color lo lleva la intensidad, no el tono.** El 2048 clásico le da un color
propio a cada ficha, que serían once tonos saturados a la vez contra el tope de
dos del §1 del sistema de diseño. Una rampa sobre el acento dice lo mismo —
cuánto vale esta ficha comparada con las de al lado — y además ordena: más
oscura es siempre más grande. Chunk: **3.4 kB gzip**, contra un presupuesto de 60.

**Una jugada que no mueve nada se rechaza, no se ignora.** Aceptarla llenaría la
pila de deshacer de pasos idénticos — habría que tocar deshacer cuatro veces
para volver una jugada — y de paso el shell puede decir por qué, que es
información real: ese lado está trabado.

✅ = **entra sin tocar el contrato.** Una jugada produce un estado, el shell
apila el anterior y deshacer sigue significando algo. En Simon la secuencia se
reproduce con un temporizador en la vista, que es exactamente lo que ya hace
Memoria para volver a tapar un par: el motor sigue sin saber que existe el
tiempo.

**Lo que NO entra en el contrato actual:** Snake, Tetris, N-back, Stroop.
Todos los juegos de hoy son por turnos — una jugada produce un estado y el shell
apila el anterior. Un juego en tiempo real invierte eso: el reloj genera estados
sin que el jugador haga nada, y deshacer deja de significar algo. Es una fase,
no un juego más.

---

## 🔮 Backlog (post-v1, no distraerse)

- ~~Nonograma~~ (hecho: primer juego post-Fase 7)
- ~~2048~~ (hecho: segundo del estante arcade)
- Solitario, Sopa de letras, Kakuro, Hashi
- Puzzle diario con semilla compartida
- Sincronización en la nube (la interfaz de `/storage` ya lo permite)
- Logros y niveles de perfil
- Temas alternativos (el design system ya lo soporta: es cambiar una capa de tokens)
