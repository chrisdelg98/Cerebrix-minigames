<div align="center">

# 🧠 Cerebrix

### Una colección de minijuegos de concentración que se siente bien en el bolsillo

_Sudoku, Buscaminas y más — en una arquitectura donde agregar el próximo juego toma un día, no una semana._

<br/>

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![PWA](https://img.shields.io/badge/PWA-offline-6C4CF1?style=for-the-badge&logo=pwa&logoColor=white)](#-características)
[![License](https://img.shields.io/badge/License-MIT-2FBF71?style=for-the-badge)](#-licencia)

<br/>

**🚧 En construcción — Fase 4** · [📋 Plan](docs/PLAN.md) · [🎨 Diseño](docs/DESIGN_SYSTEM.md) · [🧵 Estilos](docs/STYLING.md) · [🔌 Contrato](docs/GAME_CONTRACT.md)

</div>

---

## ✨ Qué es esto

Cerebrix es una app de minijuegos para **desconectar cinco minutos**: en el transporte, en la fila del banco, en ese hueco entre dos reuniones.

Lo que la hace distinta no es la lista de juegos. Es que está construida sobre un **contrato de juego** — un shell que no sabe qué juego está corriendo. Timer, dificultad, guardado, estadísticas, deshacer, pistas y victoria son del shell. El juego solo aporta sus reglas y su tablero.

> **El resultado:** el juego nº 7 se escribe en un día, hereda todo lo demás gratis, y su código no toca ni una línea del núcleo.

---

## 🎮 Juegos

|     | Juego                                                               |   Estado   | Dificultades |
| :-: | ------------------------------------------------------------------- | :--------: | :----------: |
| 🔢  | **Sudoku** — clásico 9×9 con anotaciones, pistas y generador propio | 🚧 Fase 5  |     1–5      |
| 💣  | **Buscaminas** — con primer click seguro y chording                 | 📋 Fase 6  |     1–5      |
| 🃏  | **Solitario** — Klondike                                            | 💭 Backlog |      —       |
| 🧩  | **Nonograma**                                                       | 💭 Backlog |      —       |

---

## 🌟 Características

<table>
<tr>
<td width="50%" valign="top">

### 📱 Móvil de verdad

Diseñado a 360px y expandido hacia arriba. Barra de acciones al alcance del pulgar, áreas de toque de 44px, `safe-area-inset`, cero scroll horizontal. Funciona con una mano en un colectivo.

</td>
<td width="50%" valign="top">

### ⚡ 60fps o no existe

Solo se anima `transform` y `opacity`. Presupuesto de 8ms de main thread por frame, verificado con throttling 4×. Las cascadas van por onda, nunca 480 celdas a la vez.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🎨 Un token repinta todo

Sistema de diseño con tokens semánticos: color, tipografía, espaciado, sombras y movimiento. Tema claro y oscuro. Ningún componente inventa un valor propio.

</td>
<td width="50%" valign="top">

### 🦴 Sprites SVG animados

Vectoriales, escritos en código, animados con CSS puro. Nítidos en cualquier pantalla, heredan el tema solos y viajan dentro del chunk del juego que los usa.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 💾 Nunca perdés una partida

Autosave con debounce tras cada jugada y flush en `visibilitychange` — el único evento confiable cuando el móvil mata la pestaña. IndexedDB con estado versionado y migraciones.

</td>
<td width="50%" valign="top">

### 🔌 Offline y lazy

PWA instalable, sin backend. Cada juego es un chunk aparte que se descarga al abrirlo — con prefetch al hacer hover o tocar la tarjeta, así ya está listo cuando soltás el dedo.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ♿ Accesible por defecto

Navegación completa por teclado, foco siempre visible, contraste AA en ambos temas, `aria-live` para el estado del juego y respeto a `prefers-reduced-motion`.

</td>
<td width="50%" valign="top">

### 🧪 Lógica pura y testeada

Los motores de juego no importan React ni CSS. Se testean sin DOM, corren en Web Workers y sobreviven a cualquier cambio de UI.

</td>
</tr>
</table>

---

## 🏗️ Arquitectura

```
┌────────────────────────── /core ──────────────────────────┐
│  contract · registry · router · shell · sesión de juego   │
│  ⛔ no conoce ningún juego — solo el contrato             │
└──────────────────────────┬────────────────────────────────┘
                           │  GameModule
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
  /games/sudoku    /games/minesweeper     /games/_dummy
   engine · view     engine · view         (test vivo del
   sprites · data    sprites               contrato)

       ▲                   ▲                   ▲
       └───────────────────┼───────────────────┘
                   /design  (tokens · componentes · animaciones)
                   /storage (IndexedDB detrás de una interfaz)
```

**Cuatro reglas, enforcadas por ESLint en CI:**

1. 🚫 Un juego no importa de otro juego.
2. 🚫 `/core` no importa de `/games` — solo el registro, con `import()` perezoso.
3. 🚫 `/games/*/engine` no importa React, CSS ni `/design`.
4. 🚫 `/design` no importa de `/core` ni de `/games`.

📖 Detalle completo en [**GAME_CONTRACT.md**](docs/GAME_CONTRACT.md).

---

## 🚀 Empezar

```bash
# Requisitos: Node 20+ (recomendado 22, ver .nvmrc)
git clone <url-del-repo>
cd Cerebrix-minigames

npm install
npm run prepare      # instala los git hooks (ver nota de seguridad abajo)
npm run dev          # → http://localhost:5173
```

### 📜 Scripts

| Comando              | Qué hace                                 |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Servidor de desarrollo con HMR           |
| `npm run build`      | Typecheck + build de producción          |
| `npm run preview`    | Sirve el build localmente                |
| `npm run test`       | Tests unitarios (Vitest)                 |
| `npm run test:watch` | Tests en modo watch                      |
| `npm run lint`       | ESLint + reglas de frontera              |
| `npm run lint:css`   | Stylelint + reglas del sistema de diseño |
| `npm run typecheck`  | TypeScript en modo `strict`              |
| `npm run format`     | Prettier sobre todo el repo              |
| `npm run verify`     | Todo lo anterior — lo mismo que corre CI |

### 🔒 Nota sobre dependencias

Los `postinstall` de paquetes npm son el principal vector de ataque de la cadena de suministro: código que se ejecuta en tu máquina al instalar, antes de que importes nada. Por eso:

- `.npmrc` fija **`ignore-scripts=true`** — ningún paquete ejecuta scripts al instalarse.
- Como efecto lateral, el `prepare` de Husky tampoco corre solo: se instala una vez con `npm run prepare`.
- CI usa `npm ci --ignore-scripts` + `npm audit --audit-level=high` en cada push.
- `package-lock.json` está versionado: todos instalan exactamente lo mismo.

---

## 🗂️ Estructura

```
cerebrix/
├── 📁 docs/          Plan, sistema de diseño y contrato
├── 📁 src/
│   ├── 🧠 core/      Contrato, registro, router, shell
│   ├── 🎨 design/    Tokens, componentes base, animaciones, sprites
│   ├── 💾 storage/   Persistencia e interfaz de estadísticas
│   └── 🎮 games/     Un directorio autocontenido por juego
└── 📁 tests/
```

---

## 🧭 Hoja de ruta

```
✅ Fase 0  Andamiaje            tooling, alias, lint de fronteras, CI
✅ Fase 1  Contrato + shell     el esqueleto que carga juegos que no conoce
✅ Fase 2  Design system        tokens, componentes, animaciones
✅ Fase 3  Persistencia         autosave, estadísticas, migraciones
🚧 Fase 4  Dificultad           escala 1–5 unificada
📋 Fase 5  Sudoku               el primer juego real
📋 Fase 6  Buscaminas           la prueba de fuego de la arquitectura
📋 Fase 7  Pulido               PWA, offline, presupuestos de performance
```

📋 Detalle y criterios de aceptación en [**PLAN.md**](docs/PLAN.md).

---

## 🤝 Agregar un juego

<details>
<summary><b>Checklist completo</b> (click para desplegar)</summary>

<br/>

1. Creá `/src/games/<id>/` con `engine/`, `view/` y `sprites/`.
2. Implementá `GameEngine` — **sin importar React ni CSS**.
3. Escribí la vista consumiendo componentes de `/design`.
4. Exportá el `GameModule` por defecto desde `index.ts`.
5. Agregá una entrada en `REGISTRY` con `load: () => import(...)`.
6. Verificá que `serialize` → `deserialize` sea round-trip exacto.
7. Probá a 360px, con teclado, y con animaciones reducidas.
8. **Confirmá que el diff no toca `/core`.** Si lo toca, justificá por qué en el PR.

</details>

---

## 📄 Licencia

MIT © Christian Arevalo

<div align="center">
<br/>

**Hecho para esos cinco minutos en los que el cerebro necesita otra cosa.** 🧠✨

</div>
