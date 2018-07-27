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

module.exports = function(connectionString) {
  const client = new Client({
    connectionString: connectionString
  });

  client.connect(function(err) {
    console.log("connected");
    if (err) {
      throw err;
    }
  });

  client.on("drain", function() {
    console.log("drained.");
  });

  return {
    addData: function(data, target) {
      return new Promise((resolve, reject) => {
        // TODO make this configurable, sample it from the features list,
        // although setting CRSes is not allowed in latest version of geojson standard

        var srid = 4326;

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
            console.log(insertQuery);
            // sweeping up all errors if they happen
            // todo this could be so much nicer
            let allErrors = [];

            if (err) {
              allErrors.push(err);
            }

            itemsProcessed++;
            if (itemsProcessed === array.length && allErrors.length) {
              console.log(allErrors);

              reject(allErrors);
            } else if (itemsProcessed === array.length) {
              resolve(data);
            }
          });
        });
      });
    },

    addTable: function(target, cb) {
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
    }
  };
};
