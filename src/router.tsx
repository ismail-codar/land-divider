// Route tree (code-based).
//
//   /                                   -> redirect /lands
//   /lands                              land list
//   /lands/new                          empty editor (?tool=draw)
//   /lands/$landId                      editor layout: land summary        ?view&sheet&tool&edge&vertex&menu&merge
//   /lands/$landId/parcels/$parcelId    editor with parcel detail          (same search params)
//   /design                             design document
import { createRootRoute, createRoute, createRouter, notFound, Outlet, redirect } from '@tanstack/react-router';
import LandEditorPage from './app/LandEditorPage';
import LandsPage from './app/LandsPage';
import { validateLandSearch } from './app/navSearch';
import NewLandPage from './app/NewLandPage';
import NotFound from './app/NotFound';
import DocPage from './doc/DocPage';
import { getLand, listLands } from './data/lands';

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => <NotFound />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/lands', replace: true });
  },
});

const designRoute = createRoute({ getParentRoute: () => rootRoute, path: '/design', component: DocPage });

const landsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lands',
  loader: () => listLands(),
  component: LandsPage,
});

const newLandRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lands/new',
  validateSearch: validateLandSearch,
  component: NewLandPage,
});

const landRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lands/$landId',
  validateSearch: validateLandSearch,
  loader: async ({ params }) => {
    const land = await getLand(params.landId);
    if (!land) throw notFound();
    return land;
  },
  component: LandEditorPage,
  notFoundComponent: () => <NotFound what="Arazi" />,
});

// Children render nothing: the editor in the layout reads the matched params.
const landIndexRoute = createRoute({ getParentRoute: () => landRoute, path: '/' });
const parcelRoute = createRoute({ getParentRoute: () => landRoute, path: 'parcels/$parcelId' });

const routeTree = rootRoute.addChildren([
  indexRoute,
  designRoute,
  landsRoute,
  newLandRoute,
  landRoute.addChildren([landIndexRoute, parcelRoute]),
]);

export const router = createRouter({ routeTree, scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface HistoryState {
    /** One-off snackbar message for the page being opened. */
    flash?: string;
  }
}
