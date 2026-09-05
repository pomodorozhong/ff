# Freeform Moodboards

A static, read-only collection of infinite canvases, powered by React and Excalidraw. The gallery is designed for GitHub Pages at `https://pomodorozhong.github.io/ff/`.

## Local development

Use Node.js 22, then install and run the site:

```sh
npm install
npm run dev
```

The production base path defaults to `/ff/`. Set `VITE_BASE_PATH=/` for a user/organization site or custom domain, or to `/<repository>/` when deploying another project repository.

## Publishing a board

1. Create or edit the board in ordinary Excalidraw.
2. Export an `.excalidraw` file **with embedded image data**.
3. Give it a lowercase kebab-case filename, such as `color-notes.excalidraw`, and place it directly in `canvas/`.
4. Run `npm run check:boards` and `npm run validate:boards` before committing.
5. Commit and push. The build discovers the file and generates its catalog entry and `/ff/color-notes/` page automatically.

Replace the source file to update a board. Delete it to remove the current published copy. Renaming a file changes its public URL. Never edit or commit `canvas/index.json`; it is generated in `dist/`. Builds start with a clean output directory, so removed boards do not leave stale pages.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run check:boards` | Report raw board sizes and enforce limits |
| `npm run validate:boards` | Validate names, JSON shape, embedded images, and layout |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Run focused unit tests |
| `npm run build` | Run all prebuild checks, build Vite, and publish boards/routes |
| `npm run preview` | Preview the production build |

Boards below 40,000,000 bytes pass the size check; boards from 40,000,000 through 89,999,999 bytes produce a warning; boards at or above 90,000,000 bytes fail. These decimal-byte limits do not guarantee good mobile performance, and repository history continues to grow when source files are replaced.

## Safety and privacy

The deployed site and every committed board are public. Do not include private photos, secrets, credentials, or content you cannot publish. Deleting a board does not remove it from Git history or copies already downloaded. The viewer accepts embedded PNG, JPEG, WebP, and GIF images, rejects remote image sources and web frames, and allows only HTTP(S) links.

## Deployment

In repository **Settings → Pages**, select **GitHub Actions** as the source. Pull requests validate and build with read-only repository permissions. Pushes to `main` and manual runs additionally upload only `dist/` and deploy via the `github-pages` environment with scoped Pages and OIDC permissions.

The build copies canonical board bytes unchanged, creates `dist/canvas/index.json`, one static `<id>/index.html` per board, and `dist/404.html`. Direct links and refreshes therefore work without server rewrites. Live Pages behavior and representative image-heavy mobile performance still need to be verified after repository Pages is enabled.

## v1 limitations

This site is a viewer and downloader only. Authoring, authentication, collaboration, browser saves, media processing, remote media, and persistent offline caching are intentionally out of scope. Downloads are the original portable `.excalidraw` files and can be reopened in Excalidraw.
