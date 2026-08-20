import s from './Examples.module.css';

function Row({ pads, caption }: { pads: number[]; caption: string }) {
  return (
    <div className={s.strip}>
      {pads.map((pad, i) => (
        <span key={i} className={s.pad} data-pad={pad} />
      ))}
      <span className={s.note}>{caption}</span>
    </div>
  );
}

export function SequenceExample() {
  return (
    <div className={s.figure}>
      <Row pads={[1, 3]} caption="te muestran" />
      <Row pads={[1, 3]} caption="repetís" />
    </div>
  );
}

export function GrowExample() {
  return (
    <div className={s.figure}>
      <Row pads={[1, 3]} caption="ronda 2" />
      <Row pads={[1, 3, 2]} caption="ronda 3" />
    </div>
  );
}
