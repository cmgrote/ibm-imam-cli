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

/**
 * @file Ingest the metadata from all hosts described in the provided Excel file.  Some non-obvious notes for the Excel file: under the "Assets to import" heading, different bridges expect different input, but in all cases multiple entries should be semi-colon (;) delimited within the one cell.  For database entries, use the form 'DBNAME|SCHEMANAME|TABLENAME' (or any subset: e.g. just 'DBNAME|SCHEMANAME' to import all tables in that schema), while for file entries use the form '/some/path/' to load all files in that directory (note trailing '/'), or just '/some/path/to/file.ext' to load a single file (note no trailing '/').
 * @license Apache-2.0
 * @requires ibm-imam-cli
 * @requires yargs
 * @example
 * // ingests all metadata descripted in the file Example.xlsx into the server 'services', using 'engine.ibm.com' as the metadata interchange server
 * ./ingestMetadata.js -f Example.xlsx -e engine.ibm.com -d services:9445 -u isadmin -p isadmin
 */

var imamcli = require('../');

// Command-line setup
var yargs = require('yargs');
var argv = yargs
    .usage('Usage: $0 -f <file>')
    .option('f', {
      alias: 'file',
      describe: 'Path to output file to produce',
      demand: true, requiresArg: true, type: 'string',
      default: 'Example.xlsx'
    })
    .option('e', {
      alias: 'engine',
      describe: 'Fully qualified hostname of the engine tier',
      demand: true, requiresArg: true, type: 'string'
    })
    .env('DS')
    .option('d', {
      alias: 'domain',
      describe: 'Host and port for invoking IA REST',
      demand: true, requiresArg: true, type: 'string'
    })
    .option('u', {
      alias: 'deployment-user',
      describe: 'User for invoking IA REST',
      demand: true, requiresArg: true, type: 'string',
      default: "isadmin"
    })
    .option('p', {
      alias: 'deployment-user-password',
      describe: 'Password for invoking IA REST',
      demand: true, requiresArg: true, type: 'string',
      default: "isadmin"
    })
    .help('h')
    .alias('h', 'help')
    .wrap(yargs.terminalWidth())
    .argv;

// Base settings
var host_port = argv.domain.split(":");
imamcli.setCtx(argv.deploymentUser, argv.deploymentUserPassword, host_port[0], host_port[1], argv.engine);

imamcli.loadMetadata(argv.file, function(results) {
  if (results.code == 0) {
    console.log(results.stdout);
  } else {
    console.error(results.stdout);
    process.exit(results.code);
  }
});
