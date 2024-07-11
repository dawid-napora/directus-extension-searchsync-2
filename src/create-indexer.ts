import type { defineHook } from "@directus/extensions-sdk";
import type { ExtensionConfig } from "./types";

import striptags from "striptags";

import availableIndexers from "./indexers";
import { filteredObject, flattenObject, objectMap } from "./utils";

export function createIndexer(
  config: ExtensionConfig,
  {
    logger,
    database,
    services,
    getSchema,
  }: Pick<
    Parameters<Parameters<typeof defineHook>[0]>[1],
    "logger" | "database" | "services" | "getSchema"
  >
) {
  if (!config.server.type || !availableIndexers[config.server.type]) {
    throw Error(
      `Broken config file. Missing or invalid indexer type "${
        config.server.type || "Unknown"
      }".`
    );
  }

  const indexer = availableIndexers[config.server.type]!(config.server);

  const ensureCollectionIndex = async (collection: string) => {
    const collectionIndex = getCollectionIndexName(collection);
    await indexer.createIndex(collectionIndex).catch((error) => {
      const message = getErrorMessage(error);
      logger.warn(`Cannot create collection "${collectionIndex}". ${message}`);
      logger.debug(error);
    });
  };

  const initCollectionIndexes = async () => {
    for (const collection of Object.keys(config.collections)) {
      await ensureCollectionIndex(collection);
      await initItemsIndex(collection);
    }
  };

  const initItemsIndex = async (collection: string) => {
    const schema = await getSchema();

    if (!schema.collections[collection]) {
      logger.warn(`Collection "${collection}" does not exists.`);
      return;
    }

    const query = new services.ItemsService(collection, { database, schema });

    await indexer
      .deleteItems(getCollectionIndexName(collection))
      .catch((error) => {
        logger.warn(
          `Cannot drop collection "${collection}". ${getErrorMessage(error)}`
        );
        logger.debug(error);
      });

    const pk = schema.collections[collection].primary;
    const limit = config.batchLimit || 100;

    for (let offset = 0; ; offset += limit) {
      const items = await query.readByQuery({
        fields: [pk],
        filter: config.collections[collection]?.filter || [],
        limit,
        offset,
      });

      if (!items || !items.length) break;

      await updateItemIndex(
        collection,
        items.map((i: Record<string, any>) => i[pk])
      );
    }
  };

  const deleteItemIndex = async (collection: string, ids: string[]) => {
    const collectionIndex = getCollectionIndexName(collection);
    for (const id of ids) {
      await indexer.deleteItem(collectionIndex, id).catch((error) => {
        logger.warn(
          `Cannot delete "${collectionIndex}/${id}". ${getErrorMessage(error)}`
        );
        logger.debug(error);
      });
    }
  };

  const updateItemIndex = async (collection: string, ids: string[]) => {
    const schema = await getSchema();

    const collectionIndex = getCollectionIndexName(collection);

    const query = new services.ItemsService(collection, {
      knex: database,
      schema: schema,
    });

    const pk = schema.collections[collection]?.primary || "id";

    const items = await query.readMany(ids, {
      fields: config.collections[collection]?.fields
        ? [pk, ...config.collections[collection].fields]
        : ["*"],
      filter: config.collections[collection]?.filter || [],
    });

    const processedIds: string[] = [];

    for (const item of items) {
      const id = item[pk];

      await indexer
        .updateItem(collectionIndex, id, prepareObject(item, collection), pk)
        .then(() => {
          processedIds.push(id);
        })
        .catch((error) => {
          logger.warn(
            `Cannot index "${collectionIndex}/${id}". ${getErrorMessage(error)}`
          );
          logger.debug(error);
        });
    }

    if (items.length < ids.length) {
      for (const id of ids.filter((x) => !processedIds.includes(x))) {
        await indexer.deleteItem(collectionIndex, id).catch((error) => {
          logger.warn(
            `Cannot index "${collectionIndex}/${id}". ${getErrorMessage(error)}`
          );
          logger.debug(error);
        });
      }
    }
  };

  const prepareObject = (body: Record<string, any>, collection: string) => {
    const meta: Record<string, string> = {};

    if (config.collections[collection]?.collectionField) {
      meta[config.collections[collection].collectionField] = collection;
    }

    if (config.collections[collection]?.transform) {
      return {
        ...config.collections[collection].transform(
          body,
          {
            striptags,
            flattenObject,
            objectMap,
            filteredObject,
          },
          collection
        ),
        ...meta,
      };
    } else if (config.collections[collection]?.fields) {
      return {
        ...filteredObject(
          flattenObject(body),
          config.collections[collection].fields
        ),
        ...meta,
      };
    }

    return {
      ...body,
      ...meta,
    };
  };

  const getCollectionIndexName = (collection: string) => {
    return config.collections[collection]?.indexName || collection;
  };

  const getErrorMessage = (error: any) => {
    if (error && error.message) return error.message;

    if (
      error &&
      error.response &&
      error.response.data &&
      error.response.data.error
    )
      return error.response.data.error;

    return error.toString();
  };

  return {
    ensureCollectionIndex,
    initCollectionIndexes,

    initItemsIndex,
    updateItemIndex,
    deleteItemIndex,

    getCollectionIndexName,
  };
}
