import { Link } from 'react-router-dom';

import s from './NotFound.module.css';

export function NotFound() {
  return (
    <div className={s.notFound} id="main">
      <h1>Por acá no hay nada</h1>
      <p className={s.text}>Ese juego no está en el registro.</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  );
}
