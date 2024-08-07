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

  const ensureCollectionIndex = async (indexName: string) => {
    await indexer.createIndex(indexName).catch((error) => {
      const message = getErrorMessage(error);
      logger.warn(`Cannot create collection "${indexName}". ${message}`);
      logger.debug(error);
    });
  };

  const initCollectionIndexes = async () => {
    for (const indexName of Object.keys(config.indexes)) {
      await ensureCollectionIndex(indexName);
      await initItemsIndex(indexName);
    }
  };

  const initItemsIndex = async (indexName: string) => {
    const schema = await getSchema();

    const collection = config.indexes[indexName].collectionName
    if (!schema.collections[collection]) {
      logger.warn(`Collection "${collection}" does not exists.`);
      return;
    }

    const query = new services.ItemsService(collection, { database, schema });

    await indexer
      .deleteItems(indexName)
      .catch((error) => {
        logger.warn(
          `Cannot drop collection "${collection}". ${getErrorMessage(error)}`
        );
        logger.debug(error);
      });

    const primaryKey = schema.collections[collection].primary;
    const limit = config.batchLimit || 100;

    for (let offset = 0; ; offset += limit) {
      const items = await query.readByQuery({
        fields: [primaryKey],
        filter: config.indexes[indexName]?.filter || [],
        deep: config.indexes[indexName]?.deep || {},
        limit,
        offset,
      });

      if (!items || !items.length) break;

      await updateItemIndex(
        indexName,
        items.map((i: Record<string, any>) => i[primaryKey])
      );
    }
  };

  const deleteItemIndex = async (indexName: string, ids: string[]) => {
    for (const id of ids) {
      await indexer.deleteItem(indexName, id).catch((error) => {
        logger.warn(
          `Cannot delete "${indexName}/${id}". ${getErrorMessage(error)}`
        );
        logger.debug(error);
      });
    }
  };

  const updateItemIndex = async (indexName: string, ids: string[]) => {
    const schema = await getSchema();

    const index = config.indexes[indexName]
    const collection = index.collectionName

    const query = new services.ItemsService(collection, {
      knex: database,
      schema: schema,
    });

    const primaryKey = schema.collections[collection]?.primary || "id";

    const items = await query.readMany(ids, {
      fields: index?.fields
        ? [primaryKey, ...index.fields]
        : ["*"],
      filter: index?.filter || [],
    });

    const processedIds: string[] = [];

    for (const item of items) {
      const id = item[primaryKey];

      await indexer
        .updateItem(indexName, id, prepareObject(item, indexName), primaryKey)
        .then(() => {
          processedIds.push(id);
        })
        .catch((error) => {
          logger.warn(
            `Cannot index "${indexName}/${id}". ${getErrorMessage(error)}`
          );
          logger.debug(error);
        });
    }

    if (items.length < ids.length) {
      for (const id of ids.filter((x) => !processedIds.includes(x))) {
        await indexer.deleteItem(indexName, id).catch((error) => {
          logger.warn(
            `Cannot index "${indexName}/${id}". ${getErrorMessage(error)}`
          );
          logger.debug(error);
        });
      }
    }
  };

  const prepareObject = (body: Record<string, any>, indexName: string) => {
    const meta: Record<string, string> = {};

    if (config.indexes[indexName]?.collectionField) {
      meta[config.indexes[indexName].collectionField] = config.indexes[indexName].collectionName;
    }

    if (config.indexes[indexName]?.transform) {
      return {
        ...config.indexes[indexName].transform(
          body,
          {
            striptags,
            flattenObject,
            objectMap,
            filteredObject,
          },
          indexName
        ),
        ...meta,
      };
    } else if (config.indexes[indexName]?.fields) {
      return {
        ...filteredObject(
          flattenObject(body),
          config.indexes[indexName].fields
        ),
        ...meta,
      };
    }

    return {
      ...body,
      ...meta,
    };
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
  };
}
