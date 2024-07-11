import { dirname } from "node:path";
import { cosmiconfigSync } from "cosmiconfig";

export function loadConfig(env: Record<string, any>) {
  const cosmiconfig = cosmiconfigSync("searchsync", {
    stopDir: dirname(env.CONFIG_PATH),
  });

  if (env.EXTENSION_SEARCHSYNC_CONFIG_PATH) {
    const config = cosmiconfig.load(env.EXTENSION_SEARCHSYNC_CONFIG_PATH);
    if (!config || !config.config) {
      throw Error(
        `EXTENSION_SEARCHSYNC_CONFIG_PATH is set, but "${env.EXTENSION_SEARCHSYNC_CONFIG_PATH}" is missing or broken.`
      );
    }

    return config.config;
  }

  const config = cosmiconfig.search(dirname(env.CONFIG_PATH));
  if (!config || !config.config) {
    throw Error(
      "Missing configuration, follow https://github.com/dawid-napora/directus-extension-searchsync-2#configuration to set it up."
    );
  }

  return config.config;
}

export function validateConfig(config: any) {
  if (typeof config !== "object") {
    throw Error("Broken config file. Configuration is not an object.");
  }

  if (!config.collections) {
    throw Error('Broken config file. Missing "collections" section.');
  }

  if (!config.server) {
    throw Error('Broken config file. Missing "server" section.');
  }
}
