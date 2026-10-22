import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import ParselEditor from '../editor/ParselEditor';
import type { EditorNav } from '../editor/nav';
import { createLand } from '../mock/lands';
import { navFromUrl, navToUrl } from './navSearch';
import { useDevice } from './useDevice';
import { useNavSync } from './useNavSync';

const newApi = getRouteApi('/lands/new');

/** Empty editor: draw a boundary (?tool=draw) or import; the created land replaces this entry. */
export default function NewLandPage() {
  const search = newApi.useSearch();
  const navigate = useNavigate();
  const device = useDevice();
  const nav = useMemo(() => navFromUrl(undefined, search), [search]);
  const onNavChange = useNavSync(nav, (n: EditorNav, replace) => navigate({ to: '/lands/new', search: navToUrl(n).search, replace }));

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <ParselEditor
        device={device}
        scenario="empty"
        statusBar={false}
        landName="Yeni arazi"
        nav={nav}
        onNavChange={onNavChange}
        onBack={() => navigate({ to: '/lands' })}
        onLandCreated={(model, flash) => {
          const drawn = model.parcels.length === 1;
          const rec = createLand(drawn ? 'Yeni arazi' : 'İçe aktarılan arazi', model);
          if (drawn) navigate({ to: '/lands/$landId/parcels/$parcelId', params: { landId: rec.id, parcelId: 'p1' }, replace: true, state: { flash } });
          else navigate({ to: '/lands/$landId', params: { landId: rec.id }, replace: true, state: { flash } });
        }}
      />
    </div>
  );
}
