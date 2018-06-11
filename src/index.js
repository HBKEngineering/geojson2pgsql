var util = require("util");

const { Client } = require("pg");

var getFeatures = function(data) {
  switch (data.type) {
    case "FeatureCollection":
      return data.features;

    case "Feature":
      return [data];

    default:
      throw new Error("Unsupported GeoJSON type: " + data.type);
  }
};

var asWKT = function(geometry, srid) {
  switch (geometry.type) {
    case "LineString":
      return util.format(
        "SRID=%d;LINESTRING(%s)",
        srid,
        geometry.coordinates
          .map(function(x) {
            return x.join(" ");
          })
          .join(",")
      );

    case "Point":
      return util.format(
        "SRID=%d;Point(%s)",
        srid,
        geometry.coordinates.join(" ")
      );

    default:
      throw new Error("Unsupported GeoJSON geometry type: " + geometry.type);
  }
};

const client = new Client({
  connectionString: process.env.PG_CONNECTION_STRING
});

client.connect(function(err) {
  if (err) {
    throw err;
  }
});

client.on("drain", function() {
  console.log("drained.");
});

module.exports.addTable = function(target, data, cb) {
  // TODO don't always do this
  client.query(`DROP TABLE IF EXISTS ${target}`);
  var createTableQuery = `CREATE TABLE ${target} (id BIGSERIAL UNIQUE NOT NULL, geojson_id VARCHAR, properties JSONB, geometry GEOMETRY, PRIMARY KEY(id))`;
  console.log(createTableQuery);

  client.query(createTableQuery, function(err) {
    if (err) {
      console.warn(err);
      cb(err);
    } else {
      cb(false);
    }
  });
};

module.exports.addData = function(data, target, callback) {
  var srid = 4326; // TODO make this configurable, sample it from the features list

  // TODO make this promise-based rather than the ugly incrementer
  var itemsProcessed = 0;
  getFeatures(data).forEach(function(feature, index, array) {
    var params = [
      feature.id,
      feature.properties,
      asWKT(feature.geometry, srid)
    ];

    var insertQuery = `INSERT INTO ${target} (geojson_id, properties, geometry) VALUES ($1, $2, $3)`;

    client.query(insertQuery, params, function(err) {
      if (err) {
        console.warn(err);
      }

      itemsProcessed++;
      if (itemsProcessed === array.length) {
        callback(null, data);
      }
    });
  });
};
