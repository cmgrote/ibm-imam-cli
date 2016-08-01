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
 * @file Builds an Excel workbook where each sheet contains the required and optional parameters for an individaul IMAM bridge (required parameters in red)
 * @license Apache-2.0
 * @requires ibm-imam-cli
 * @requires yargs
 * @example
 * // gets an Excel workbook containing templates for the various bridge parameters needed
 * ./getBridgeTemplate.js -f BridgeTemplate.xlsx
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
      default: 'BridgeTemplate.xlsx'
    })
    .help('h')
    .alias('h', 'help')
    .wrap(yargs.terminalWidth())
    .argv;

var aBridges = imamcli.getImplementedBridges();

var wb = null;
for (var i = 0; i < aBridges.length; i++) {
  wb = imamcli.getTemplateForBridge(aBridges[i], wb);
}
wb.xlsx.writeFile(argv.file).then(function() {
  console.log("Created template in: " + argv.file);
});
