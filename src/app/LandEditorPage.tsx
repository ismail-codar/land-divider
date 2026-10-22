import { getRouteApi, Outlet, useNavigate, useParams, useRouter, useRouterState } from '@tanstack/react-router';
import { useMemo } from 'react';
import ParselEditor from '../editor/ParselEditor';
import type { EditorNav } from '../editor/nav';
import { createLand, renameLand, saveLand } from '../mock/lands';
import { navFromUrl, navToUrl } from './navSearch';
import { useDevice } from './useDevice';
import { useNavSync } from './useNavSync';

const landApi = getRouteApi('/lands/$landId');

/**
 * Layout route for /lands/$landId and /lands/$landId/parcels/$parcelId.
 * The editor stays mounted across child routes; the URL drives its selection, mode and overlays.
 */
export default function LandEditorPage() {
  const land = landApi.useLoaderData();
  const search = landApi.useSearch();
  const { landId } = landApi.useParams();
  const { parcelId } = useParams({ strict: false });
  const flash = useRouterState({ select: (s) => s.location.state.flash });
  const navigate = useNavigate();
  const router = useRouter();
  const device = useDevice();
  const nav = useMemo(() => navFromUrl(parcelId, search), [parcelId, search]);

  const go = (n: EditorNav, replace: boolean) => {
    const { parcelId, search } = navToUrl(n);
    if (parcelId) navigate({ to: '/lands/$landId/parcels/$parcelId', params: { landId, parcelId }, search, replace });
    else navigate({ to: '/lands/$landId', params: { landId }, search, replace });
  };
  const onNavChange = useNavSync(nav, go);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <ParselEditor
        key={landId}
        device={device}
        statusBar={false}
        landName={land.name}
        onRename={(name) => {
          renameLand(landId, name);
          void router.invalidate();
        }}
        land={land.model}
        flash={flash}
        nav={nav}
        onNavChange={onNavChange}
        onBack={() => navigate({ to: '/lands' })}
        onNewLand={() => navigate({ to: '/lands/new' })}
        onLandChange={(model) => saveLand(landId, model)}
        onLandCreated={(model, flash, name) => {
          // Imports open as a new land; the current one is kept as is.
          const rec = createLand(name || 'İçe aktarılan arazi', model);
          navigate({ to: '/lands/$landId', params: { landId: rec.id }, state: { flash } });
        }}
      />
      <Outlet />
    </div>
  );
}
