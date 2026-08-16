# Cerebrix — guía para agentes

Colección de minijuegos de concentración construida sobre un **contrato de juego**:
el shell no sabe qué juego está corriendo. Timer, dificultad, guardado,
estadísticas, deshacer, pistas y victoria son del shell; el juego solo aporta sus
reglas y su tablero.

---

## Lo primero: `docs/` es normativo y le gana a cualquier guía general

Cuatro documentos, y son la fuente de verdad — no una sugerencia:

| Documento                                        | Qué decide                                   |
| ------------------------------------------------ | -------------------------------------------- |
| [`docs/PLAN.md`](docs/PLAN.md)                   | Fases, alcance y criterios de aceptación     |
| [`docs/GAME_CONTRACT.md`](docs/GAME_CONTRACT.md) | La interfaz de juego y de quién es cada cosa |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Los valores: color, tipografía, motion, a11y |
| [`docs/STYLING.md`](docs/STYLING.md)             | Dónde vive cada regla CSS                    |

Si una skill instalada, una convención popular o un hábito general contradice a
estos documentos, **mandan los documentos**. Son más específicos porque hablan de
este proyecto. Cuando algo acá esté mal, se corrige el documento en el mismo
cambio — no se lo esquiva.

Antes de escribir CSS: STYLING.md. Antes de tocar el contrato: GAME_CONTRACT.md.
Antes de empezar una fase: la sección de esa fase en PLAN.md.

---

## Las reglas que no se negocian

**Fronteras** (las enforcea ESLint, y `tests/boundaries.test.ts` verifica que el
lint realmente dispare):

1. Un juego no importa de otro juego.
2. `/core` no importa de `/games` — solo `registry.ts`, con `import()` perezoso.
3. `/games/*/engine` no importa React, ni CSS, ni `/design`. Lógica pura.
4. `/design` no importa de `/core` ni de `/games`. Es la capa más baja.
5. `/storage` no importa de `/core`, `/design` ni `/games`. Habla en primitivos.

**Estilos:** cero hex fuera de `palette.css`, cero `--raw-*` fuera de
`theme.css`, cero `!important`, cero shorthand `transition`, cero `style={}` que
no sea exclusivamente custom properties. Solo se animan `transform` y `opacity`.

**Contrato:** si un juego necesita que el shell cambie, **el contrato está mal**
— se arregla el contrato, no se parcha el shell. Un juego nuevo no debería tocar
`/core` salvo por su entrada en el registro; si el diff lo toca, hay que
justificarlo.

---

## Un test tiene que poder fallar

Durante la Fase 0 la config de fronteras estuvo mal escrita dos veces y el lint
pasó en verde igual. Después el test de fronteras cayó en la misma trampa por
caché del `Program` de TypeScript: los casos fallaban por un `Parsing error` y el
caso positivo pasaba por el motivo equivocado.

De ahí la regla: **cuando escribas un test de una regla, verificá que se ponga
rojo si la regla se rompe.** Un aserto que no puede fallar es peor que ninguno,
porque compra confianza falsa. Lo mismo vale para un `not.toMatch` que pasaría
igual si todo el archivo estuviera roto.

---

## Trabajo diario

```bash
npm run dev       # http://localhost:5173
npm run verify    # typecheck + lint + lint:css + test — lo mismo que corre CI
```

`npm run verify` tiene que pasar antes de dar algo por terminado. CI agrega
`npm audit --audit-level=high`, `format:check` y `build`.

**Presupuestos** (se verifican en Fase 7, pero se miran en cada fase): bundle
inicial ≤ 120 kB gzip, cada juego ≤ 60 kB gzip aparte.

---

## Convenciones

- **Idioma:** documentación, UI y mensajes de commit en español. Comentarios de
  código en inglés.
- **Comentarios:** explican el _porqué_, no el _qué_. Si un comentario describe
  lo que la línea ya dice, sobra.
- **Commits:** conventional commits (`feat(scope):`, `fix(ci):`, `docs:`), cuerpo
  en español explicando la decisión y su motivo.
- **Ramas:** `main` es la rama de trabajo de este proyecto.
- **Dependencias:** `.npmrc` fija `ignore-scripts=true`. Agregar una dependencia
  se justifica; el lockfile se versiona.
- **Skills de agentes:** el contenido de `.agents/` está en `.gitignore`; se
  versiona `skills-lock.json`. Restaurar desde el lock, no commitear la prosa.

---

## Estado actual

Fases 0 a 8 terminadas: andamiaje, contrato + shell, sistema de diseño,
persistencia, dificultad unificada, Sudoku, Buscaminas, PWA offline e instalable,
y Nonograma. El detalle, los criterios de aceptación y lo que quedó
explícitamente pendiente están en [`docs/PLAN.md`](docs/PLAN.md).

`src/games/_dummy` **no se borra** cuando lleguen los juegos reales: es la
implementación mínima del contrato completo y su test verifica que el shell
funciona con un módulo que no conoce.
