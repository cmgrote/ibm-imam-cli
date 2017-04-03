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
 * @file Ingest the metadata from all hosts described in the provided Excel file.  Some non-obvious notes for the Excel file: under the "Assets to import" heading, different bridges expect different input, but in all cases multiple entries should be semi-colon (;) delimited within the one cell.  For database entries, use the form 'DBNAME|SCHEMANAME|TABLENAME' (or any subset: e.g. just 'DBNAME|SCHEMANAME' to import all tables in that schema), while for file entries use the form '/some/path/' to load all files in that directory (note trailing '/'), or just '/some/path/to/file.ext' to load a single file (note no trailing '/').
 * @license Apache-2.0
 * @requires ibm-imam-cli
 * @requires ibm-iis-commons
 * @requires yargs
 * @example
 * // ingests all metadata descripted in the file Example.xlsx into the server the script is running on
 * ./ingestMetadata.js -f Example.xlsx
 */

const imamcli = require('ibm-imam-cli');
const commons = require('ibm-iis-commons');

// Command-line setup
const yargs = require('yargs');
const argv = yargs
    .usage('Usage: $0 -f <file>')
    .option('f', {
      alias: 'file',
      describe: 'Path to Excel file containing description of sources',
      demand: true, requiresArg: true, type: 'string'
    })
    .option('a', {
      alias: 'authfile',
      describe: 'Authorisation file containing environment context',
      requiresArg: true, type: 'string'
    })
    .help('h')
    .alias('h', 'help')
    .wrap(yargs.terminalWidth())
    .argv;

const envCtx = new commons.EnvironmentContext(null, argv.authfile);

imamcli.loadMetadata(envCtx, argv.file, function(results) {
  if (results.code === 0) {
    console.log(results.stdout);
  } else {
    console.error(results.stdout);
    process.exit(results.code);
  }
});
