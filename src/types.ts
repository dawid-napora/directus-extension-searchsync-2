import type { Filter } from "@directus/types";

export type ExtensionConfig = {
  server: IndexerConfig;
  batchLimit?: number;
  collections: Record<string, CollectionConfig>;
};

export type CollectionConfig = {
  collection?: string;
  collectionName?: string;
  collectionField?: string;
  indexName?: string;
  fields?: string[];
  filter?: Filter;
  transform?: (
    input: Record<string, any>,
    utils: Record<string, Function>,
    collectionName: string
  ) => Record<string, any>;
};

export type IndexerConfig = {
  type: string;
  appId?: string;
  key?: string;
  host?: string;
  headers?: Record<string, string>;
};

export type IndexerInterface = (config: IndexerConfig) => {
  createIndex: (collection: string) => Promise<void>;
  deleteItems: (collection: string) => Promise<void>;
  deleteItem: (collection: string, id: string) => Promise<void>;
  updateItem: (
    collection: string,
    id: string,
    data: Record<string, any>,
    pk?: string
  ) => Promise<void>;
};
