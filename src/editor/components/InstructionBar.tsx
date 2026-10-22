import { SHADOW_MD } from '../constants';
import Icon from './Icon';

export interface Instruction { text: string; icon: string; step: string; closable: boolean; bg: string; fg: string }

/** Mode / hint strip at the top of the canvas. */
export default function InstructionBar({ x, y, maxWidth, instr, onClose }: { x: number; y: number; maxWidth: number; instr: Instruction; onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, maxWidth, display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 0 12px', minHeight: 44, background: instr.bg, color: instr.fg, boxShadow: SHADOW_MD }}>
      {instr.step && <div style={{ fontSize: 12, fontWeight: 800, padding: '2px 6px', border: '1px solid currentColor' }}>{instr.step}</div>}
      <Icon name={instr.icon} size={16} />
      <div style={{ fontSize: 14, fontWeight: 600, textWrap: 'pretty', padding: '8px 0' }}>{instr.text}</div>
      {instr.closable && (
        <div onClick={onClose} title="Moddan çık" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
          <Icon name="icon-x" size={18} />
        </div>
      )}
    </div>
  );
}
