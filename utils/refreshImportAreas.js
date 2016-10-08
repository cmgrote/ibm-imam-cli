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
 * @file Refresh the metadata handled by the specified import areas
 * @license Apache-2.0
 * @requires ibm-imam-cli
 * @requires ibm-iis-commons
 * @requires yargs
 * @example
 * // refreshes all of the metadata from all import areas
 * ./refreshImportAreas.js
 * @example
 * // refreshes all of the metadata from any import areas not already updated within the last 24 hours
 * ./refreshImportAreas.js -t 24
 * @example
 * // refreshes only the import area named 'TEST_IMPORT', and only if it wasn't already refreshed within the last 48 hours
 * ./refreshImportAreas.js -n TEST_IMPORT -t 48
 */

const imamcli = require('ibm-imam-cli');
const commons = require('ibm-iis-commons');

// Command-line setup
const yargs = require('yargs');
const argv = yargs
    .usage('Usage: $0 -n <name> -t <numberOfDays>')
    .option('n', {
      alias: 'name',
      describe: 'Name of the Import Area to refresh',
      requiresArg: true, type: 'string'
    })
    .option('t', {
      alias: 'time',
      describe: 'Refresh anything more stale than this time in hours',
      requiresArg: true, type: 'number'
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

// Base settings
const bContinueOnError = true;

const importAreaName = argv.name;
const importAreaRefreshTime = argv.time;

const envCtx = new commons.EnvironmentContext();
if (argv.authfile !== undefined && argv.authfile !== "") {
  envCtx.authFile = argv.authfile;
}

const areas = imamcli.getImportAreaList(envCtx);
const now = new Date();
let refreshBefore = new Date();
if (importAreaRefreshTime !== undefined && importAreaRefreshTime !== "") {
  refreshBefore = refreshBefore.setHours(now.getHours() - importAreaRefreshTime);
}

// If just a single import area name was provided, just refresh that (if needed according to timescale provided)
if (importAreaName !== undefined && importAreaName !== "") {
  if (areas.hasOwnProperty(importAreaName)) {
    const sharedTime = areas[importAreaName].shareTS;
    refreshAreaByTimestamp(importAreaName, sharedTime, refreshBefore);
  } else {
    console.error("No import area exists with the name '" + importAreaName + "'.");
    process.exit(1);
  }

// Otherwise, refresh all import areas
} else {

  for (const key in areas) {
    if (areas.hasOwnProperty(key)) {
      const importAreaName = key;
      const sharedTime = areas[importAreaName].shareTS;
      refreshAreaByTimestamp(importAreaName, sharedTime, refreshBefore);
    }
  }

}

function refreshAreaByTimestamp(importAreaName, lastShared, refreshIfBefore) {

  if (lastShared !== undefined && lastShared !== "") {
    if (lastShared < refreshIfBefore) {
      runRefresh(importAreaName, bContinueOnError);
    } else {
      console.log("Import area '" + importAreaName + "' already refreshed within the timescale specified.");
    }
  } else {
    runRefresh(importAreaName, bContinueOnError);
  }

}

function runRefresh(importAreaName, bContinueOnError) {
  const result = imamcli.createOrUpdateImportArea(envCtx, importAreaName);
  if (result.code === 0) {
    console.log(result.stdout);
  } else {
    console.error(result.stdout);
    if (!bContinueOnError) {
      process.exit(1);
    }
  }
}
