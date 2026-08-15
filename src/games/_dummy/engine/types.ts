/** The dummy's whole world. Serializable by construction, like every TState. */
export interface DummyState {
  tiles: boolean[];
}

export type DummyMove = { kind: 'mark'; index: number } | { kind: 'winNow' };

export interface DummyConfig {
  tiles: number;
}
