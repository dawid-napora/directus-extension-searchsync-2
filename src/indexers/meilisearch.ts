import type { IndexerInterface } from "../types";
import MeiliSearch from "meilisearch";

export const meilisearch: IndexerInterface = (config) => {
  if (!config.host) {
    throw Error("No HOST set. The server.host is mandatory.");
  }

  const host = new URL(config.host);
  if (!host.hostname || (host.pathname && host.pathname !== "/")) {
    throw Error(
      `Invalid server.host, it must be like http://meili.example.com/`
    );
  }

  const client = new MeiliSearch({
    host: config.host,
    apiKey: config.key,
  });

  const createIndex = async (collection: string) => {
    await client.createIndex(collection).catch((error) => {
      if (error.response && error.response.status === 404) return;
      throw error;
    });
  };

  const deleteItems = async (collection: string) => {
    await client
      .index(collection)
      .deleteAllDocuments()
      .catch((error) => {
        if (error.response && error.response.status === 404) return;
        throw error;
      });
  };

  const deleteItem = async (collection: string, id: string) => {
    await client
      .index(collection)
      .deleteDocument(id)
      .catch((error) => {
        if (error.response && error.response.status === 404) return;
        throw error;
      });
  };

  const updateItem = async (
    collection: string,
    id: string,
    data: Record<string, any>,
    pk?: string
  ) => {
    await client
      .index(collection)
      .updateDocuments([{ ...(pk ? { [pk]: id } : {}), ...data }], {
        primaryKey: pk,
      })
      .catch((error) => {
        if (error.response && error.response.status === 404) return;
        throw error;
      });
  };

  return { createIndex, deleteItems, deleteItem, updateItem };
};
