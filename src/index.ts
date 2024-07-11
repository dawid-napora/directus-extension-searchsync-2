import { defineHook } from "@directus/extensions-sdk";
import { loadConfig, validateConfig } from "./config";
import { createIndexer } from "./create-indexer";

export default defineHook(
  ({ action, init }, { env, logger, database, services, getSchema }) => {
    const extensionConfig = loadConfig(env);
    validateConfig(extensionConfig);

    const indexer = createIndexer(extensionConfig, {
      services,
      database,
      logger: logger.child({ extension: "directus-extension-searchsync-2" }),
      getSchema,
    });

    init("cli.before", ({ program }) => {
      const usersCommand = program.command("extension:searchsync");

      usersCommand
        .command("index")
        .description(
          "directus-extension-searchsync-2: Push all documents from all collections, that are setup in extension configuration"
        )
        .action(initCollectionIndexesCommand);
    });

    action("server.start", () => {
      if (!extensionConfig.reindexOnStart) return;
      indexer.initCollectionIndexes();
    });

    action("items.create", ({ collection, key }) => {
      if (!extensionConfig.collections.hasOwnProperty(collection)) return;
      indexer.updateItemIndex(collection, [key]);
    });

    action("items.update", ({ collection, keys }) => {
      if (!extensionConfig.collections.hasOwnProperty(collection)) return;
      indexer.updateItemIndex(collection, keys);
    });

    action("items.delete", ({ collection, payload }) => {
      if (!extensionConfig.collections.hasOwnProperty(collection)) return;
      indexer.deleteItemIndex(collection, payload);
    });

    const initCollectionIndexesCommand = async () => {
      await indexer
        .initCollectionIndexes()
        .then(() => {
          process.exit(0);
        })
        .catch((error) => {
          logger.error(error);
          process.exit(1);
        });
    };
  }
);
