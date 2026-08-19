import { useState } from 'react';

import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Cell, type CellState } from '../components/Cell';
import { DifficultyPicker } from '../components/DifficultyPicker';
import { EmptyState } from '../components/EmptyState';
import { FilterChips } from '../components/FilterChips';
import { Grid } from '../components/Grid';
import { IconButton } from '../components/IconButton';
import { Modal } from '../components/Modal';
import { ProgressBar } from '../components/ProgressBar';
import { SettingsToggles } from '../components/SettingsToggles';
import { Skeleton } from '../components/Skeleton';
import { StatTile } from '../components/StatTile';
import { Timer } from '../components/Timer';
import { useToast } from '../components/Toast';
import { Clock } from '../sprites/Clock';
import { LogoCerebrix } from '../sprites/LogoCerebrix';
import { AllGamesIcon, ArcadeIcon, LogicIcon } from '../sprites/CategoryIcons';
import { MotionIcon, SunIcon } from '../sprites/SettingsIcons';
import { Streak } from '../sprites/Streak';
import { Trophy } from '../sprites/Trophy';

import s from './KitchenSink.module.css';

/**
 * Every shared component, in every state, on one page.
 *
 * This is the Phase 2 acceptance criterion (docs/PLAN.md): a place where a
 * token change can be seen repainting everything at once, and where a state
 * nobody exercises in a game still gets looked at. Lazily routed — it is not in
 * anyone's bundle unless they ask for it.
 */

const CELL_STATES: CellState[] = [
  'empty',
  'filled',
  'fixed',
  'selected',
  'peer',
  'same',
  'error',
  'hint',
];

export function KitchenSink() {
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [shelf, setShelf] = useState('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  return (
    <div className={s.page} id="main">
      <header className={s.masthead}>
        <LogoCerebrix size={32} />
        <h1 className={s.title}>Kitchen sink</h1>
        <SettingsToggles />
      </header>

      <p className={s.note}>
        Todo el sistema de diseño en una página. Cambiá un token en <code>tokens/palette.css</code>{' '}
        y todo esto se repinta.
      </p>

      <Section title="Button">
        <div className={s.row}>
          <Button variant="primary">Primary</Button>
          <Button>Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className={s.row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button icon={<Clock size={16} />}>Con icono</Button>
        </div>
      </Section>

      <Section title="IconButton">
        <div className={s.row}>
          <IconButton label="Tema" icon={<SunIcon />} />
          <IconButton label="Movimiento" icon={<MotionIcon />} variant="solid" />
          <IconButton label="Deshabilitado" icon={<Clock size={20} />} disabled />
        </div>
      </Section>

      <Section title="Badge">
        <div className={s.row}>
          <Badge>neutral</Badge>
          <Badge tone="accent">accent</Badge>
          <Badge tone="gold">gold</Badge>
          <Badge tone="success">success</Badge>
          <Badge tone="danger">danger</Badge>
        </div>
      </Section>

      <Section title="Cell — los siete estados">
        <div className={s.cells}>
          {CELL_STATES.map((state, i) => (
            <div key={state} className={s.cellSample}>
              <Cell state={state} value={i + 1} label={`Celda ${state}`} />
              <span className={s.caption}>{state}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Grid — 9×9 con líneas de bloque">
        <Grid cols={9} label="Tablero de ejemplo" maxSize="320px">
          {Array.from({ length: 81 }, (_, i) => {
            const row = Math.floor(i / 9);
            const col = i % 9;
            return (
              <Cell
                key={i}
                state={row === 4 && col === 4 ? 'selected' : 'empty'}
                label={`fila ${row + 1}, columna ${col + 1}, vacía`}
                blockEdges={[
                  ...(col % 3 === 2 && col !== 8 ? (['right'] as const) : []),
                  ...(row % 3 === 2 && row !== 8 ? (['bottom'] as const) : []),
                ]}
              />
            );
          })}
        </Grid>
      </Section>

      <Section title="Grid — no cuadrado (Buscaminas)">
        <Grid cols={8} rows={5} label="Tablero rectangular" maxSize="280px">
          {Array.from({ length: 40 }, (_, i) => (
            <Cell key={i} state="empty" label={`celda ${i + 1}`} />
          ))}
        </Grid>
      </Section>

      <Section title="DifficultyPicker">
        {/* The whole scale, to see the five level colours side by side. A real
            game only ever gets the levels it declares. */}
        <DifficultyPicker
          value={difficulty}
          options={[
            { value: 1, label: 'Fácil', color: 'var(--c-difficulty-1)' },
            { value: 2, label: 'Casual', color: 'var(--c-difficulty-2)' },
            { value: 3, label: 'Normal', color: 'var(--c-difficulty-3)' },
            { value: 4, label: 'Difícil', color: 'var(--c-difficulty-4)' },
            { value: 5, label: 'Experto', color: 'var(--c-difficulty-5)' },
          ]}
          onChange={setDifficulty}
        />
      </Section>

      <Section title="FilterChips">
        {/* Con icono y conteo, que es como los usa la portada. El componente no
            sabe qué son estos estantes: los recibe como opciones. */}
        <FilterChips
          value={shelf}
          options={[
            { value: 'todas', label: 'Todos', count: 8, icon: AllGamesIcon },
            { value: 'lógica', label: 'Lógica', count: 6, icon: LogicIcon },
            { value: 'arcade', label: 'Arcade', count: 2, icon: ArcadeIcon },
          ]}
          onChange={setShelf}
          label="Categoría"
        />
      </Section>

      <Section title="Timer y ProgressBar">
        <div className={s.row}>
          <Timer running elapsedMs={0} />
          <Timer running={false} elapsedMs={125_000} />
        </div>
        <ProgressBar value={0.35} label="Ejemplo de progreso" />
      </Section>

      <Section title="StatTile">
        <div className={s.row}>
          <StatTile label="Partidas" value={128} icon={<Trophy size={18} />} />
          <StatTile label="Racha" value={7} icon={<Streak size={18} count={7} />} trend="up" />
          <StatTile label="Mejor tiempo" value="04:12" icon={<Clock size={18} running />} />
        </div>
      </Section>

      <Section title="Skeleton">
        <div className={s.stack}>
          <Skeleton w="60%" h="var(--sp-5)" />
          <Skeleton h="var(--sp-8)" />
        </div>
      </Section>

      <Section title="Modal y Toast">
        <div className={s.row}>
          <Button
            onClick={() => {
              setModalOpen(true);
            }}
          >
            Abrir modal
          </Button>
          <Button
            onClick={() => {
              toast.show('Guardado', { tone: 'success' });
            }}
          >
            Toast success
          </Button>
          <Button
            onClick={() => {
              toast.show('Algo salió mal', { tone: 'danger' });
            }}
          >
            Toast danger
          </Button>
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          sprite={<Trophy size={40} />}
          title="Todavía no hay estadísticas"
          description="Jugá una partida y esto se llena."
          action={<Button variant="primary">Jugar</Button>}
        />
      </Section>

      <Section title="Sprites">
        <div className={s.row}>
          <Trophy size={28} />
          <Trophy size={28} state="unlocked" />
          <Streak size={28} count={0} />
          <Streak size={28} count={5} />
          <Clock size={28} />
          <Clock size={28} running />
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
        title="Un modal"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setModalOpen(false);
            }}
          >
            Entendido
          </Button>
        }
      >
        Cierra con Esc, con click afuera, o con el botón. El foco queda atrapado adentro.
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{title}</h2>
      <div className={s.stack}>{children}</div>
    </section>
  );
}
