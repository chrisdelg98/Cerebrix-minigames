import { useRef, useState } from 'react';

import { Button } from '@design/components/Button';
import { useToast } from '@design/components/Toast';

import { useStorage } from '../storageContext';

import s from './DataControls.module.css';

export interface DataControlsProps {
  /** Called after a successful import, so Home can re-read what changed. */
  onImported: () => void;
}

/**
 * The user's own copy of their history. There is no backend, so an export IS
 * the backup — without it, clearing site data loses everything with no recourse.
 */
export function DataControls({ onImported }: DataControlsProps) {
  const storage = useStorage();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const exportAll = async () => {
    setBusy(true);
    try {
      const json = await storage.exportAll();
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `cerebrix-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      // Revoking immediately would race the download in some browsers.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      toast.show('No se pudo exportar', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const importFrom = async (file: File) => {
    setBusy(true);
    try {
      await storage.importAll(await file.text());
      onImported();
      toast.show('Datos importados', { tone: 'success' });
    } catch (cause) {
      // parseBackup rejects before deleting anything, so a bad file is a no-op.
      toast.show(cause instanceof Error ? cause.message : 'Archivo inválido', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.controls}>
      <Button
        size="sm"
        disabled={busy}
        onClick={() => {
          void exportAll();
        }}
      >
        Exportar datos
      </Button>

      <Button
        size="sm"
        disabled={busy}
        onClick={() => {
          fileInput.current?.click();
        }}
      >
        Importar
      </Button>

      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        aria-label="Archivo de respaldo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so choosing the same file twice fires change again.
          event.target.value = '';
          if (file) void importFrom(file);
        }}
      />
    </div>
  );
}
