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
 * @file Pre-pends a header row to a data file that allows it to be importable via IMAM
 * @license Apache-2.0
 * @requires ibm-imam-cli
 * @requires prepend-file
 * @requires shelljs
 * @requires yargs
 * @example
 * // injects a header into TableName.dat based on the table definition (for the table TableName) in the FileContainingDDL.sql
 * ./addHeaderToDataFile.js -f TableName.dat -s FileContainingDDL.sql
 */

const imamcli = require('../');
const prependFile = require('prepend-file');
const shell = require('shelljs');
const path = require('path');

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
      describe: 'Path to data file that should have header injected',
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

if (argv.delimiter === ":") {
  throw new Error("Cannot use ':' as a delimiter -- it is a reserved character for the schema definition.");
}

const tableName = path.basename(argv.file, path.extname(argv.file));
let header = "";
if (typeof argv.sql !== 'undefined' && argv.sql !== null) {
  const tablesToFields = imamcli.convertColumnDefinitionsToFieldDefinitions(argv.sql);
  header = imamcli.getHeaderLineForTable(tablesToFields, tableName, argv.delimiter);
} else {
  // Setup a default header, treating everything as a string, if there is no table definition to pull from somewhere
  const firstLine = shell.head({'-n': 1}, argv.file);
  const aFields = firstLine.split(argv.delimiter);
  for (let i = 0; i < aFields.length; i++) {
    header += "C" + (i + 1) + ":NVarChar" + argv.delimiter;
  }
  header = header.substring(0, header.length - argv.delimiter.length);
}

prependFile(argv.file, header + "\n", function(err) {
  if (err) {
    console.error("ERROR: Prepending failed -- " + err);
    process.exit(1);
  } else {
    console.log('Successfully injected heading for table ' + tableName + " into " + argv.file);
  }
});
