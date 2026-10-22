// In-memory mock of the lands backend. Swap these functions for API calls later;
// the routes only depend on this module's signatures.
import { sample } from '../editor/sample';
import type { LandModel } from '../editor/types';

export interface LandRecord {
  id: string;
  name: string;
  model: LandModel;
}

const lands = new Map<string, LandRecord>([
  ['karaagac', { id: 'karaagac', name: 'Karaağaç Arazisi', model: sample() }],
]);
let seq = 1;

export function listLands(): LandRecord[] {
  return [...lands.values()];
}

export function getLand(id: string): LandRecord | undefined {
  return lands.get(id);
}

export function createLand(name: string, model: LandModel): LandRecord {
  let id = 'arazi-' + seq++;
  while (lands.has(id)) id = 'arazi-' + seq++;
  const rec = { id, name, model };
  lands.set(id, rec);
  return rec;
}

export function renameLand(id: string, name: string) {
  const rec = lands.get(id);
  if (rec) lands.set(id, { ...rec, name });
}

export function saveLand(id: string, model: LandModel) {
  const rec = lands.get(id);
  if (rec) lands.set(id, { ...rec, model });
}
