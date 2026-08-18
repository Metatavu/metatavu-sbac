/**
 * useWorkspace — the folder the app was started with.
 *
 * The application is launched with a directory argument and owns the `.yaml`
 * blueprints inside it. This hook models that folder: list, open, save, create.
 *
 * `fs` is injected so the same hook works against an Electron/Tauri bridge, the
 * File System Access API, or the in-memory stub used by tests and this demo.
 * Expected shape:
 *
 *   fs.list()            -> Promise<string[]>            paths relative to the folder
 *   fs.read(path)        -> Promise<string>              YAML text
 *   fs.write(path, text) -> Promise<void>
 *   fs.exists(path)      -> Promise<boolean>
 */

import { useCallback, useEffect, useState } from 'react';
import { documentFromFile, toFile } from '../model/document.js';
import { countEntries, parseYaml, serializeYaml } from '../model/yaml.js';
import { blankDocument } from '../model/samples.js';
import { slugify } from '../model/ids.js';

export function useWorkspace({ fs, folder, onOpen }) {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setFiles(await fs.list());
  }, [fs]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Read a file, parse and validate it, and hand the document to the editor. */
  const open = useCallback(
    async (path) => {
      try {
        const text = await fs.read(path);
        const doc = documentFromFile(parseYaml(text), text, countEntries);
        setCurrentPath(path);
        setError('');
        onOpen(doc, path);
      } catch (cause) {
        setError(`${path}: ${cause.message}`);
      }
    },
    [fs, onOpen]
  );

  const save = useCallback(
    async (doc, path = currentPath) => {
      await fs.write(path, serializeYaml(toFile(doc)));
      await refresh();
      return path;
    },
    [currentPath, fs, refresh]
  );

  /** Create `<slug>.yaml` in the folder from a lane preset, then open it. */
  const create = useCallback(
    async (name, preset) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Give the blueprint a name.');
      const path = /\.ya?ml$/.test(trimmed) ? trimmed : `${slugify(trimmed)}.yaml`;
      if (await fs.exists(path)) throw new Error(`${path} already exists in this folder.`);

      const title = trimmed.replace(/\.ya?ml$/, '').replace(/[-_/]+/g, ' ');
      const doc = blankDocument(title.charAt(0).toUpperCase() + title.slice(1), preset);
      await fs.write(path, serializeYaml(toFile(doc)));
      await refresh();
      setCurrentPath(path);
      onOpen(doc, path);
      return path;
    },
    [fs, onOpen, refresh]
  );

  return { folder, files, currentPath, error, open, save, create, refresh };
}

/**
 * In-memory stub of the `fs` contract — used by the demo entry point and tests.
 * Swap for the real bridge in the desktop shell.
 */
export function createMemoryFs(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    list: async () => [...store.keys()],
    read: async (path) => {
      if (!store.has(path)) throw new Error('file not found');
      return store.get(path);
    },
    write: async (path, text) => {
      store.set(path, text);
    },
    exists: async (path) => store.has(path),
  };
}
