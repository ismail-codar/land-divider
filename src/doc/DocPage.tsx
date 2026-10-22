// Design document page: header, live prototype frames and spec sections.
import DecisionsSection from './sections/DecisionsSection';
import DevicesSection from './sections/DevicesSection';
import FlowsSection from './sections/FlowsSection';
import Header from './sections/Header';
import InfoArchSection from './sections/InfoArchSection';
import PrototypeSection from './sections/PrototypeSection';
import RulesSection from './sections/RulesSection';
import ScreensSection from './sections/ScreensSection';
import TokensSection from './sections/TokensSection';

export default function DocPage() {
  return (
    <div style={{ fontFamily: 'Archivo,system-ui,sans-serif', color: '#201e1d', background: '#f3f2f2', fontSize: 15, lineHeight: 1.55, padding: '0 0 120px' }}>
      <Header />
      <PrototypeSection />
      <ScreensSection />
      <FlowsSection />
      <DevicesSection />
      <InfoArchSection />
      <RulesSection />
      <TokensSection />
      <DecisionsSection />
    </div>
  );
}
