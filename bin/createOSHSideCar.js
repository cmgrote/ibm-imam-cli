#!/usr/bin/env node

/***
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * @file Creates an OSH schema sidecar file for the provided data file, allowing it to be importable via IMAM
 * @license Apache-2.0
 * @requires ibm-imam-cli
 * @requires shelljs
 * @requires yargs
 * @example
 * // creates an OSH schema sidecar for TableName.dat based on the table definition (for the table TableName) in the FileContainingDDL.sql
 * ./createOSHSideCar.js -f TableName.dat -s FileContainingDDL.sql
 */

const imamcli = require('ibm-imam-cli');
const shell = require('shelljs');
const path = require('path');
const fs = require('fs');

// Command-line setup
const yargs = require('yargs');
const argv = yargs
    .usage('Usage: $0 -f <file> [-s <file>] [-d <delimiter>]')
    .option('s', {
      alias: 'sql',
      describe: 'Path to SQL file containing DDL to convert',
      demand: false, requiresArg: true, type: 'string'
    })
    .option('f', {
      alias: 'file',
      describe: 'Path to data file for which sidecar should be created',
      demand: true, requiresArg: true, type: 'string'
    })
    .option('d', {
      alias: 'delimiter',
      describe: 'Delimiter to use between columns',
      demand: true, requiresArg: true, type: 'string',
      default: "|"
    })
    .help('h')
    .alias('h', 'help')
    .wrap(yargs.terminalWidth())
    .argv;

const tableName = path.basename(argv.file, path.extname(argv.file));
const sidecarName = argv.file + ".osh";

let oshSchema = "";
if (typeof argv.sql !== 'undefined' && argv.sql !== null) {
  const tablesToFields = imamcli.getColumnDefinitionsFromDDL(argv.sql);
  oshSchema = imamcli.getOSHSchemaForTable(tablesToFields, tableName, argv.delimiter);
} else {
  // Setup a default schema, treating everything as a string, if there is no table definition to pull from somewhere
  const firstLine = shell.head({'-n': 1}, argv.file);
  const aFields = firstLine.split(argv.delimiter);
  oshSchema = "// FileStructure: file_format='delimited', header='false'\n" +
      "record { record_delim='\\n', delim='" + ((argv.delimiter === undefined || argv.delimiter === null) ? "|" : argv.delimiter) + "', final_delim=end, null_field='' } (\n";
  for (let i = 0; i < aFields.length; i++) {
    oshSchema += "    C" + (i + 1) + ": string[max=255];\n";
  }
  oshSchema += ")";
}

fs.writeFileSync(sidecarName, oshSchema, 'utf8');
console.log('Successfully created side-car for table ' + tableName + " into " + sidecarName);
