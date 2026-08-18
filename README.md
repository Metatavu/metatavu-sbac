# Service Blueprint as Code

Local React + TypeScript editor for YAML service blueprints stored in a Git repository or any local directory. The Node server is started with one folder and permits only `.yaml` / `.yml` paths contained in that folder, so the browser never receives unrestricted filesystem access.

## Run locally

From this repository:

```bash
npm install
npm run start -- --folder /path/to/blueprint-repository
```

The app is served from [http://127.0.0.1:4173](http://127.0.0.1:4173). Add `--port 4300` to use another local port.

## Run from Git with npx

No npmjs publication is required. Once this repository is available on GitHub, run the included Bash launcher from a checked-out copy:

```bash
./scripts/sbac.sh --folder /path/to/blueprint-repository
```

It downloads, builds, and runs the package directly from Git using `npx`. To run the launcher without cloning this repository, use its raw GitHub URL:

```bash
curl -fsSL https://raw.githubusercontent.com/metatavu/metatavu-sbac/main/scripts/sbac.sh \
	| bash -s -- --folder /path/to/blueprint-repository
```

The default package source is `github:metatavu/metatavu-sbac#main`. Pin a release tag or use a fork by overriding `SBAC_PACKAGE`:

```bash
SBAC_PACKAGE='github:your-org/metatavu-sbac#v1.0.0' ./scripts/sbac.sh --folder ./blueprints
```

## Architecture

- `src/`: React + TypeScript workspace UI.
- `server/workspace.ts`: folder-confined read/write operations and YAML summaries.
- `server/index.ts`: Fastify API and production static hosting.
- `tests/`: server contract tests, including traversal rejection.

YAML remains authoritative. The UI uses the reference editor's semantic model, reducer, canvas, validation panel, properties panel, import/export dialogs, and deterministic SVG renderer. The reference editor source is vendored in `src/reference/`, so the TypeScript application root and API bridge can be installed and built from Git as one self-contained package.
