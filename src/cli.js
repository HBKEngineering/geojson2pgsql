#!/usr/bin/env node

"use strict";
var path = require("path");
var lib = require("./index")(process.env.PG_CONNECTION_STRING);

var optimist = require("optimist").usage(
    "Usage: $0 [<options>] <GeoJSON file> [[schema.]<table>]"
  ),
  argv = optimist.argv;

if (argv._.length < 1) {
  optimist.showHelp();
  process.exit(1);
}

var source = argv._.shift(),
  target = argv._.shift() || path.basename(source, path.extname(source));

var data = require(path.join(process.cwd(), source));

// TODO don't always drop/add table when invoking this function. maybe findOrAddTable instead?
lib.addTable("features", function(err) {
  if (!err) {
    lib.addData(data, "features", function(err, data){
      console.log(err);
    });
  }
});
