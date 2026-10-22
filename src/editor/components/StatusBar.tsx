import { BG } from '../constants';
import Icon from './Icon';

/** Fake device status bar (phone / tablet frames). */
export default function StatusBar({ height }: { height: number }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', fontSize: 14, fontWeight: 600, background: BG }}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Icon name="icon-signal" size={15} />
        <Icon name="icon-wifi" size={15} />
        <Icon name="icon-battery-full" size={17} />
      </span>
    </div>
  );
}
