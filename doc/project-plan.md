# Freeform Moodboard — v1 Implementation Plan

## Brief for Codex

Build a small static moodboard gallery using Vite, TypeScript, React, and `@excalidraw/excalidraw`. React is the integration layer for Excalidraw. Keep the implementation simple and follow the decisions below; do not add a backend or media processing service.

**Scope assumption:** v1 publishes boards for viewing and downloading. Authors create and edit boards in ordinary Excalidraw, export them with embedded images, and commit those files. Editing and saving from this website are future work.

## Goals

- Share a small collection of freeform visual boards through a public URL.
- Preserve each `.excalidraw` file as a standalone, portable source of truth, including embedded images.
- Support desktop and mobile viewing, pan/zoom, direct board links, and original-file downloads.
- Publish updates by committing and pushing to GitHub, with minimal maintenance.

## Non-goals

No accounts, access control, collaboration, server-side storage, browser-to-Git writes, autosave, image optimization, R2, external-media markers, Git LFS, custom canvas engine, or thumbnail generation pipeline. Embedded media means images supported by Excalidraw; arbitrary video/audio playback is outside v1.

## Architecture and repository

```text
Author in Excalidraw → export embedded .excalidraw → commit/push
→ GitHub Actions: validate, test, build → GitHub Pages
→ browser fetches catalog, then only the selected board
```

```text
canvas/
  moodboard1.excalidraw         # All canonical .excalidraw files live here
src/
  App.tsx                      # Path route and page shell
  components/BoardList.tsx
  components/BoardViewer.tsx
  lib/boards.ts                # Catalog validation, fetching, scene loading
  styles.css
scripts/
  check-board-sizes.mjs
  validate-boards.mjs
  publish-canvases.mjs          # Generate catalog, copy boards, and create static entry pages
tests/                         # Unit tests and browser smoke tests
.github/workflows/pages.yml
index.html
package.json
package-lock.json
vite.config.ts
tsconfig.json
README.md
```

Use compatible stable dependency versions and commit the lockfile. Keep board JSON out of JavaScript imports/bundles. After Vite builds, discover and validate `canvas/*.excalidraw`, copy those files to `dist/canvas/` unchanged, generate `dist/canvas/index.json`, and generate a static entry page for each discovered board. The catalog is a build artifact: do not maintain or commit `canvas/index.json`. Do not rewrite canonical files during builds or commits.

Generated catalog format (array order is display order):

```json
[
  {
    "id": "moodboard1",
    "title": "moodboard1",
    "file": "moodboard1.excalidraw"
  }
]
```

Discover every `.excalidraw` file directly in `canvas/`; adding a file there publishes it after a successful build. Derive `id` and `title` from the filename without the `.excalidraw` extension, and `file` from the original basename. Omit descriptions in v1. Sort entries lexicographically by ID with a deterministic, locale-independent comparison. An empty folder generates `[]`.

Require unique IDs matching `[a-z0-9]+(?:-[a-z0-9]+)*` and unique filenames restricted to a single basename ending in `.excalidraw`. Reject paths, URL schemes, traversal, and query strings. Reserve IDs `canvas` and `assets` to avoid static-directory collisions. Reject nested boards and symlinks rather than silently omitting them. Use the same discovery and validation logic for checks and catalog/page generation so each source file produces exactly one catalog entry and board route.

## Functional requirements and routing

- `/ff/` displays accessible board cards with filename-derived titles. An empty catalog displays an empty state.
- `/ff/<id>` opens a read-only Excalidraw canvas with title, back link, fit-to-content control, and download button.
- Map filenames directly to URLs: `canvas/moodboard1.excalidraw` → `https://pomodorozhong.github.io/ff/moodboard1`. Use pathname routing relative to `import.meta.env.BASE_URL`; browser back/forward must work.
- Generate `dist/<id>/index.html` from the built app entry for every catalog ID so direct visits and refreshes work on GitHub Pages without server rewrites. Pages may normalize the URL to a trailing slash; accept both forms as the same board. Generate `dist/404.html` from the same entry so unknown paths show the app’s not-found view. Keep built asset references base-prefixed so nested pages load correctly.
- Unknown routes or IDs show a helpful not-found view with a gallery link; never interpret an ID as a file path.
- Show distinct loading, network/error-with-retry, invalid-board, and empty-board states.
- Disable editing and irrelevant open/save/collaboration controls. Downloads return the original `.excalidraw` bytes with their original filename.
- Give the canvas explicit responsive dimensions. Ensure page controls have labels, visible keyboard focus, and usable touch targets.

## Board-loading behavior

1. Fetch and validate `canvas/index.json` relative to `import.meta.env.BASE_URL`. Build all static asset URLs with that base so `/repo-name/` hosting works.
2. Resolve the selected ID through the catalog. Fetch only its board from `canvas/<file>` relative to that base, check the HTTP status, and retain the original Blob for downloading. Do not preload every board or store boards in localStorage.
3. Reject files at or above the size cap before parsing where possible; check actual Blob size even when `Content-Length` is absent. Run lightweight shape/media checks, then use Excalidraw's supported `loadFromBlob` helper. Verify the API against the installed version.
4. Mount a fresh viewer keyed by board ID with restored `elements`, `files`, and safe presentation state. Passing elements alone loses embedded images. Set view mode explicitly and fit the scene on initial display; provide a reset/fit control without resetting the user's view during ordinary interaction. See the official [loading utilities](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils) and [initialData documentation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/initialdata).
5. Abort pending fetches on navigation and ignore late parsing results using a request token. Unmount the previous scene and release Blob URLs on change/unmount; a slow previous load must never replace the current board.
6. Catch parse/render failures with an error boundary. Missing image data must produce a useful error rather than silently showing an incomplete board.

Do not fetch remote URLs found inside a board. Do not add a service worker or persistent board cache in v1. Serve package fonts/assets locally where supported and verify deployment has no accidental CDN dependency.

## Lightweight size guardrail

Implement a dependency-free Node script, `scripts/check-board-sizes.mjs`, exposed as `npm run check:boards`. Use filesystem byte sizes, not string lengths or decoded image sizes. Define **MB as decimal bytes** for unambiguous thresholds:

| File size | Result |
|---|---|
| Less than 40,000,000 bytes | Pass |
| At least 40,000,000 and less than 90,000,000 bytes | Warn, continue |
| At least 90,000,000 bytes | Error, exit nonzero |

Scan every `.excalidraw` file under `canvas/`; reject symlinks. Print each warning/error with path, measured MB, and threshold, then a total-size summary. Report all violations before exiting. Filesystem failures also fail the check. Never compress, upload, modify, or automatically stage files.

Run this check before board parsing in CI and through `prebuild`. A local pre-commit hook is optional, not required infrastructure; document that CI blocks deployment but cannot prevent someone from committing locally. The README should recommend checking before committing large boards. If a hook is later added, check staged blobs rather than unrelated working-tree contents.

These are project limits, not a guarantee of good mobile performance. Repository history can grow even when every current board passes.

## Validation and security

- `validate-boards.mjs` validates discovered filenames, derived ID uniqueness, reserved IDs, file existence, and absence of nested boards or symlinks; no source catalog is required. Fail builds on malformed JSON, a non-Excalidraw top-level type, missing elements array, or invalid files map. Permit valid empty boards and compatible optional/unknown fields; do not implement a brittle full schema clone.
- For every nondeleted image element, require its referenced file entry and a supported embedded image data URL. Reject external image URLs and embedded web frames in v1. Validate supported formats against the installed Excalidraw version; do not inject SVG or any board text as HTML.
- Treat catalog text and board contents as untrusted. Render text normally through React. Allow only `https:`/`http:` clickable element links through the Excalidraw link callback; block other protocols and use `noopener,noreferrer` for new windows.
- A public Pages site is public even if its link is shared only with friends. Do not commit private photos, secrets, or credentials. Deleting a published file does not remove it from Git history or others' copies.
- No API keys or tokens belong in the browser bundle. Review dependency updates and keep the renderer patched. The size cap limits raw bytes, not decoded-image memory; test representative images on mobile.
- Keep GitHub Actions permissions minimal: read-only build/test jobs; Pages deployment receives `pages: write` and `id-token: write`. Do not expose deployment credentials to pull-request code.

## Implementation steps

1. Scaffold Vite React + TypeScript; add Excalidraw and its required CSS. Add `canvas/moodboard1.excalidraw`, a small sample board with embedded imagery, whose catalog entry will be generated automatically.
2. Implement the byte-size check, shared board discovery/validation, and deterministic catalog generation. Wire `check:boards`, `validate:boards`, `typecheck`, `test`, `build`, and `preview` scripts; `prebuild` runs size checking then validation. The build runs Vite followed by `publish-canvases.mjs` to copy the discovered boards unchanged, write `dist/canvas/index.json`, and generate board entry pages and `404.html`.
3. Implement the gallery and pathname routes, including empty and not-found states. Keep the route resolver small; no router dependency is required.
4. Add lazy-loaded Excalidraw viewing, full embedded-file loading, responsive layout, fit control, cancellation, error handling, and original download.
5. Add focused tests below and verify the production build under both `/` and a non-root base path.
6. Add the Pages workflow and author README. Document add/update/remove steps: export, copy board into `canvas/`, check, commit, push. Updates replace the source file; removals delete it. Explain that the build automatically regenerates the catalog and routes, and renaming a file changes its URL; use a clean `dist/` on each build to avoid stale pages.
7. Run all checks and smoke tests. Deliver the source, lockfile, workflow, sample board, and README with any remaining limitations stated. Do not add future-work infrastructure to v1.

## Deployment

Use GitHub Actions as the repository's Pages source. On pull requests run install, size/format validation, typecheck, tests, and production build. On pushes to the default branch (and manual dispatch), run the same checks, upload only `dist/` as a Pages artifact, and deploy through the official Pages actions and `github-pages` environment. Set deployment concurrency to avoid competing deployments.

Use `npm ci` with a pinned supported Node LTS version. Configure Vite `base` as `/ff/` for `https://pomodorozhong.github.io/ff/`; document how to change it for another repository or `/` for a user/organization site or custom domain. Follow the official [Vite Pages deployment guide](https://vite.dev/guide/static-deploy.html).

Confirm the output contains `canvas/index.json`, unchanged boards in `canvas/`, one `<id>/index.html` per board, `404.html`, and all required application assets. Smoke-test the actual deployed direct board URL and download. If account access is unavailable, deliver the workflow and precise setup instructions, and mark live deployment verification as pending.

## Testing

- **Unit:** size boundaries at 40,000,000 and 90,000,000 bytes, aggregate failures, filename validation, reserved IDs, nested boards and symlinks, deterministic catalog ordering and filename-derived fields, empty-folder output, add/remove discovery, runtime rejection of invalid catalog entries, invalid scene JSON, and missing or remote image references. Test the size classifier with numeric inputs; do not commit huge fixtures.
- **Browser:** gallery → board → back, direct pathname URL reload (with and without a trailing slash), unknown ID, empty scene, failed fetch and retry, corrupt scene, and fast switching while an earlier request is delayed.
- **Portability:** download a sample, compare its bytes with the source, and reopen it in ordinary Excalidraw with images intact.
- **Visual/manual:** confirm embedded images actually render, fit/pan/zoom work, canvas resizes, keyboard controls are usable, and a representative image-heavy board is usable on a phone. Record limitations rather than promising a fixed load time.
- **Production:** run typecheck, unit/browser tests, and build; preview with `/ff/` as the project subpath. Check generated entry pages using a static server without SPA fallback, then verify direct links and refreshes on Pages. Verify no board fetch occurs until selection and no external media requests occur.

## Acceptance criteria

- [ ] A fresh checkout installs with `npm ci` and passes documented checks.
- [ ] All `.excalidraw` files live directly in `canvas/`; adding a valid board automatically creates its catalog entry and page after build/deploy, without code or catalog edits.
- [ ] `canvas/moodboard1.excalidraw` is viewable at `https://pomodorozhong.github.io/ff/moodboard1` (a trailing-slash redirect is acceptable).
- [ ] Embedded images render; pan/zoom, fit, navigation, mobile layout, and original download work.
- [ ] Shared board URLs survive refresh on GitHub Pages under the configured base path.
- [ ] Invalid or missing boards produce useful errors; stale requests cannot overwrite the selected board.
- [ ] Files at 40 MB warn; files at 90 MB fail checks/builds; source files remain byte-for-byte unchanged.
- [ ] Downloaded boards reopen independently in Excalidraw with embedded images intact.
- [ ] Only static assets are deployed; there is no backend, R2 dependency, media pipeline, or browser secret.
- [ ] README explains authoring, size limits, public visibility, deployment, and any unverified live checks.

## Future work: only when real limits are reached

Measure load time, mobile memory, total site size, repository growth, and traffic before changing architecture. GitHub currently limits published Pages sites to 1 GB and lists a soft bandwidth limit of 100 GB/month; recheck the [official limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) when needed.

If measured constraints justify R2, design it as a separate change: retain a portable embedded source/archive, generate a derived publish representation with content-hashed media and a manifest, and let a custom loader hydrate external media into Excalidraw. An arbitrary remote URL is not a drop-in replacement for embedded `dataURL` content. Include a self-contained export/rehydration path, CORS, upload permissions, caching, and orphan cleanup in that later design. Decide where large canonical sources live; externalizing published assets alone will not shrink existing Git history. Do not implement any of this in v1.
