# Simple search engine indexer

Inspired by the [dimitrov-adrian/directus-extension-searchsync](https://github.com/dimitrov-adrian/directus-extension-searchsync), rewritten in TypeScript, supporting Directus 10.

## Supported engines

- ✅ MeiliSearch
- 🚧 ElasticSearch (coming soon)
- 🚧 Algolia (coming soon)

## How to install

### Installing via the Directus Marketplace

1. Search for `Searchsync 2` extension in Directus Marketplace
2. Click `Install Extension`
3. [Configure the extension](#configuration)

### Installing via the npm Registry

#### 1. Modify docker-compose.yml

Open the `docker-compose.yml` file of your project and replace the `image` option with a `build` section:

```diff
- image: directus/directus:10.x.y
+ build:
+   context: ./
```

#### 2. Create a Dockerfile

At the root of your project, create a `Dockerfile` if one doesn't already exist and add the following:

```Dockerfile
FROM directus/directus:10.x.y

USER root
RUN corepack enable
USER node

RUN pnpm install directus-extension-searchsync-2
```

#### 3. Build the Docker Image

Build your Docker image:

```bash
docker compose build
```

#### 4. Start the Docker Container

Start your Docker container:

```bash
docker compose up
```

On startup, you'd see that Directus will automatically load the extension installed in the previous steps.

### Installing via the Extensions Directory

#### 1. Create an Extensions Folder

At the root of your project, create an `extensions` folder if one doesn't already exist to house the extensions.

#### 2. Clone the extension into the extensions folder

Clone the extension repository from GitHub to the `extensions` folder in your project.

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
  ...
```

#### 3. Build the extension

To build the extension you need to install dependencies and then run the `build` script:

```bash
cd directus-extension-searchsync-2
npm install
npm run build
```

#### 4. Update Docker Compose File

Open your `docker-compose.yml` file and add a volume to mount your extensions folder into the Docker container:

```yaml
volumes:
  - ./extensions:/directus/extensions/
```

#### 5. Start the Docker Container

```bash
docker compose up
```

## CLI Commands

Usage: `npx directus extension:searchsync <subdommand>`

Subcommands:

- `index` - Reindex all documents from configuration

## Configuration

The extension uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig#cosmiconfig) for configuration loader with
`searchsync` block or if `EXTENSION_SEARCHSYNC_CONFIG_PATH` is set will try to use the file.

So, configuration should comes from one of next files:

- package.json `"searchsync":{...}`
- .searchsyncrc
- .searchsyncrc.json
- .searchsyncrc.yaml
- .searchsyncrc.yml
- .searchsyncrc.js
- .searchsyncrc.cjs
- searchsync.config.js
- searchsync.config.cjs

### Environment variables

### References

- `server: object` Holds configuration for the search engine
- `batchLimit: number` Batch limit when performing index/reindex (defaults to 100)
- `reindexOnStart: boolean` Performs full reindex of all documents upon Directus starts
- `collections: object` Indexing data definition
- `collections.<collection>.filter: object` The filter query in format like Directus on which item must match to be
  indexed (check [Filter Rules ](https://docs.directus.io/reference/filter-rules/#filter-rules))
- `collections.<collection>.fields: array<string>` Fields that will be indexed in Directus format
- `collections.<collection>.transform: function` (Could be defined only if config file is .js) A callback to return
  transformed/formatted data for indexing.
- `collections.<collection>.indexName: string` Force collection name when storing in search index
- `collections.<collection>.collectionField: string` If set, such field with value of the collection name will be added
  to the indexed document. Useful with conjuction with the _indexName_ option

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
      transform: (item, { flattenObject, striptags }) => {
        return {
          ...flattenObject(item),
          body: striptags(item.body),
          someCustomValue: "Hello World!",
        };
      },
    },
  },
};

// Use as object.
module.exports = config;
```

##### Collection transformation callback description

```javascript
/**
 * @param {Object} item
 * @param {{striptags, flattenObject, objectMap}} utils
 * @param {String} collectionName
 * @returns {Object}
 */
function (item, { striptags, flattenObject, objectMap }, collectionName) {
	return item
}
```

#### Search engines config references

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

New typeless behaviour, use collection names as index name.

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/"
}
```

Use Authentification.

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/",
  "username": "elastic",
  "password": "somepassword"
}
```

Ignore ssl-certificate-error.

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/",
  "ignore_cert": true
}
```

##### ElasticSearch for 5.x and 6.x (coming soon)

Old type behaviour, use collection names as types.

```json
{
  "type": "elasticsearch_legacy",
  "host": "http://search:9200/projectindex"
}
```
