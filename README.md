# Arazi Parsel Editörü

Vite + React + TypeScript port of `design/Arazi Parsel Editörü.dc.html` (the original design files in `design/` are kept unchanged as reference).

```sh
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

## Structure

```
src/
  main.tsx, index.css        entry + global styles (hover/active classes)
  doc/                       design document page
    DocPage.tsx              section composition
    data.ts                  static content (screens, flows, tokens, ...)
    ui.tsx                   shared layout pieces + DeviceFrame/PhoneFrame
    sections/*.tsx           one component per section (01–08)
  editor/                    the parcel editor
    ParselEditor.tsx         controller: state, pointer gestures, commands, render
    types.ts                 state / model types, EditorActions
    constants.ts             colors and limits
    format.ts                tr-TR number formatting
    geometry.ts              pure polygon math + topology helpers
    model.ts                 pure state-derived queries (edges, split check, projection)
    layout.ts                device layout, sheet heights, fit-to-land
    scene.ts                 state -> drawable map scene
    panel.ts / menu.ts       state -> detail panel / menu content
    sample.ts                sample land (9 parcels)
    components/              presentational components (no state)
```

`<ParselEditor device="phone|tabletPortrait|tablet|desktop" scenario="idle|parcel|..." />` fills its positioned parent.
External assets loaded from CDN in `index.html`: Archivo (Google Fonts) and the lucide-static icon font.

## Routes (TanStack Router, code-based: `src/router.tsx`)

| URL | Screen |
| --- | --- |
| `/` | redirect → `/lands` |
| `/lands` | land list |
| `/lands/new` (`?tool=draw`) | empty editor; draw/import creates a land and replaces the entry |
| `/lands/$landId` | editor, land summary |
| `/lands/$landId/parcels/$parcelId` | editor, parcel detail |
| `/design` | design document (frames are self-contained demos) |

Editor search params: `view=3d`, `tool=split\|addv`, `edge`, `vertex`, `menu`, `merge`, `sheet` (defaults omitted).
`ParselEditor` stays the source of truth; `nav`/`onNavChange` mirror it to the URL (`src/app/navSearch.ts`, `src/app/useNavSync.ts`).
Mock data lives in `src/mock/lands.ts` (in-memory; replace with API calls).
