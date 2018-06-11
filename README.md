# geojson2pgsql

When `ogr2ogr` isn't enough. Imports GeoJSON into PostgreSQL, using an auto-incrementing `id`, features'
`id` as `geojson_id`, their geometry as a PostGIS geometry (`geometry`), and their
`properties` as a JSONB column.

Requires PostgreSQL 9.2 for JSON storage, 9.3 for meaningful query
functionality.

## Usage

### As a CLI

Import `data.json` into a `data` table and display keys present in
`properties`. NOTE: this will do a `drop table.`

```bash
createdb json-test
psql -d json-test -c "create extension postgis"
DATABASE_URL=postgres://localhost/json-test geojson2pgsql data.json data
psql -d json-test -c "select json_object_keys(properties) from data"
```

### As a library

```
var lib = require("./lib");
lib.addTable("tableName", data, function(err) { /// this will do a "drop table if exists"
  if (!err) {
    lib.addData(data, "tableName");
  }
});

```

## Environment Variables

* `PG_CONNECTION_STRING` - Postgres connection string. Required.

## Limitations

* Only supports `Point`s
* Presumably other things
