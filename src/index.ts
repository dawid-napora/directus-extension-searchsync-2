import { defineHook } from "@directus/extensions-sdk";
import { loadConfig, validateConfig } from "./config";

export default defineHook(
  ({ filter, action }, { env, logger, database, services, getSchema }) => {
    const extensionConfig = loadConfig(env);
    validateConfig(extensionConfig);

    filter("items.create", () => {
      console.log("Creating Item!");
    });

    action("items.create", () => {
      console.log("Item created!");
    });
  }
);
