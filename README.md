# Simple Search Engine Indexer

Inspired by the [dimitrov-adrian/directus-extension-searchsync](https://github.com/dimitrov-adrian/directus-extension-searchsync), rewritten in TypeScript, and supporting Directus 10.

## Supported Engines

- ✅ MeiliSearch
- 🚧 ElasticSearch (coming soon)
- 🚧 Algolia (coming soon)

## Installation

### Via Directus Marketplace

1. Search for `Searchsync 2` extension in Directus Marketplace.
2. Click `Install Extension`.
3. [Configure the extension](#configuration).

### Via npm Registry

#### Step 1: Modify docker-compose.yml

Open the `docker-compose.yml` file of your project and replace the `image` option with a `build` section:

```yaml
# Before
image: directus/directus:10.x.y

# After
build:
  context: ./
```

#### Step 2: Create a Dockerfile

At the root of your project, create a `Dockerfile` if one doesn't already exist, and add the following:

```Dockerfile
FROM directus/directus:10.x.y

USER root
RUN corepack enable
USER node

RUN pnpm install directus-extension-searchsync-2
```

#### Step 3: Build the Docker Image

```bash
docker compose build
```

#### Step 4: Start the Docker Container

```bash
docker compose up
```

Directus will automatically load the extension installed in the previous steps.

### Via Extensions Directory

#### Step 1: Create an Extensions Folder

At the root of your project, create an `extensions` folder if it doesn't already exist to house the extensions.

#### Step 2: Clone the Extension into the Extensions Folder

```bash
cd extensions
git clone https://github.com/dawid-napora/directus-extension-searchsync-2.git
```

Your folder structure should look like this:

```
extensions/
  directus-extension-searchsync-2/
    dist/
      index.js
    package.json
    ...
```

#### Step 3: Build the Extension

To build the extension, install dependencies and then run the `build` script:

```bash
cd directus-extension-searchsync-2
npm install
npm run build
```

#### Step 4: Update Docker Compose File

Open your `docker-compose.yml` file and add a volume to mount your extensions folder into the Docker container:

```yaml
volumes:
  - ./extensions:/directus/extensions/
```

#### Step 5: Start the Docker Container

```bash
docker compose up
```

## CLI Commands

Usage: `npx directus extension:searchsync <subcommand>`

Subcommands:

- `index` - Reindex all documents from the configuration.

## Configuration

The extension uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig#cosmiconfig) for configuration loading with a `searchsync` block, or if `EXTENSION_SEARCHSYNC_CONFIG_PATH` is set, it will use the specified file.

Configuration can come from one of the following files:

- `package.json` `"searchsync": {...}`
- `.searchsyncrc`
- `.searchsyncrc.json`
- `.searchsyncrc.yaml`
- `.searchsyncrc.yml`
- `.searchsyncrc.js`
- `.searchsyncrc.cjs`
- `searchsync.config.js`
- `searchsync.config.cjs`

### Environment Variables

### Configuration References

- `server: object` - Holds configuration for the search engine.
- `batchLimit: number` - Batch limit when performing index/reindex (defaults to 100).
- `reindexOnStart: boolean` - Performs a full reindex of all documents upon Directus startup.
- `collections: object` - Indexing data definition.
- `collections.<collection>.filter: object` - The filter query in the Directus format to determine which items must be indexed (see [Filter Rules](https://docs.directus.io/reference/filter-rules/#filter-rules)).
- `collections.<collection>.fields: array<string>` - Fields that will be indexed in Directus format.
- `collections.<collection>.transform: function` - A callback to return transformed/formatted data for indexing (can only be defined if the config file is `.js`).
- `collections.<collection>.indexName: string` - Override collection name when storing in the search index.
- `collections.<collection>.collectionField: string` - If set, adds a field with the collection name value to the indexed document. Useful in conjunction with the `indexName` option.

### Examples

#### `.searchsyncrc.json`

```json
{
  "server": {
    "type": "meilisearch",
    "host": "http://search:7700/myindex",
    "key": "the-private-key"
  },
  "batchLimit": 100,
  "reindexOnStart": false,
  "collections": {
    "products": {
      "filter": {
        "status": "published",
        "stock": "inStock"
      },
      "fields": [
        "title",
        "image.id",
        "category.title",
        "brand.title",
        "tags",
        "description",
        "price",
        "rating"
      ]
    },
    "posts": {
      "indexName": "blog_posts",
      "collectionField": "_collection",
      "filter": {
        "status": "published"
      },
      "fields": ["title", "teaser", "body", "thumbnail.id"]
    }
  }
}
```

#### `.searchsyncrc.js`

```javascript
const config = {
  server: {
    type: "meilisearch",
    host: "http://search:7700",
    key: "the-private-key",
  },
  reindexOnStart: false,
  batchLimit: 100,
  collections: {
    pages: {
      filter: {
        status: "published",
      },
      fields: ["title", "teaser", "body", "thumbnail.id"],
      transform: (item, { flattenObject, striptags }) => ({
        ...flattenObject(item),
        body: striptags(item.body),
        someCustomValue: "Hello World!",
      }),
    },
  },
};

module.exports = config;
```

##### Collection Transformation Callback Description

```javascript
/**
 * @param {Object} item
 * @param {{striptags, flattenObject, objectMap}} utils
 * @param {String} collectionName
 * @returns {Object}
 */
function (item, { striptags, flattenObject, objectMap }, collectionName) {
  return item;
}
```

#### Search Engines Configuration References

##### Meilisearch

```json
{
  "type": "meilisearch",
  "host": "http://search:7700",
  "key": "the-private-key"
}
```

##### Algolia (coming soon)

```json
{
  "type": "algolia",
  "appId": "Application-Id",
  "key": "secret-api-key"
}
```

##### ElasticSearch (coming soon)

New typeless behavior, use collection names as the index name.

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/"
}
```

With authentication:

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/",
  "username": "elastic",
  "password": "somepassword"
}
```

Ignore SSL certificate error:

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/",
  "ignore_cert": true
}
```

##### ElasticSearch for 5.x and 6.x (coming soon)

Old type behavior, use collection names as types.

```json
{
  "type": "elasticsearch_legacy",
  "host": "http://search:9200/projectindex"
}
```
