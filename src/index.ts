import { defineHook } from "@directus/extensions-sdk";
import { loadConfig, validateConfig } from "./config";
import { createIndexer } from "./create-indexer";
import { filterObject } from "./utils";

const getIndexesFromCollection = (config: ExtensionConfig, collectionName: string) => {
  return filterObject( config.indexes,  (n) => n.collectionName === collectionName )
}

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
      const indexes = getIndexesFromCollection(extensionConfig, collection)
      if (!indexes) return;

      for (const indexKey in indexes) {
        indexer.updateItemIndex(indexKey, [key]);
      }
    });

    action("items.update", ({ collection, keys }) => {
      const indexes = getIndexesFromCollection(extensionConfig, collection)
      if (!indexes) return;

      for (const indexKey in indexes) {
        indexer.updateItemIndex(indexKey, keys);
      }
    });

    action("items.delete", ({ collection, payload }) => {
      const indexes = getIndexesFromCollection(extensionConfig, collection)
      if (!indexes) return;

      for (const indexKey in indexes) {
        indexer.deleteItemIndex(indexKey, payload);
      }
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
