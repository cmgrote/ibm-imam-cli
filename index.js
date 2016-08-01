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
 * @file Re-usable functions for interacting with IMAM via the command-line
 * @license Apache-2.0
 * @requires xmldom
 * @requires xpath
 * @requires shelljs
 * @requires fs-extra
 * @requires pretty-data
 * @requires excel4node
 */

/**
 * @module ibm-imam-cli
 */

const https = require('https');
const xmldom = require('xmldom');
const xpath = require('xpath');
require('shelljs/global');
const fs = require('fs-extra');
const pd = require('pretty-data').pd;
const xl = require('excel4node');

exports.ctx = {
  dshome: "",
  user: "",
  password: "",
  services: "",
  port: "",
  engine: ""
};

const bridgeNameToId = {
  "Amazon S3": "",
  "File Connector - Engine Tier": "CAS/LocalFileConnector",
  "File Connector - HDFS": "",
  "HDFS": "",
  "Hive Connector": "",
  "IBM Cognos TM1": "",
  "IBM Cognos TM1 Connector": "",
  "IBM InfoSphere DB2 Connector": "CAS/DB2Connector",
  "IBM InfoSphere Master Data Management": "",
  "IBM InfoSphere Streams": "",
  "IBM Netezza Connector": "",
  "JDBC Connector": "",
  "ODBC Connector": "",
  "XSD": "",
  "Oracle Connector 11g": "",
  "Oracle Connector 12c": "",
  "Greenplum connector": "",
  "Teradata Connector": ""
};

const bridgeNameToConnectorParams = {
  "IBM InfoSphere DB2 Connector": {
    dcName_:            { displayName: "Name", isRequired: true },
    dcDescription_:     { displayName: "Description" },
    Database:           { displayName: "Database", isRequired: true },
    Username:           { displayName: "User name" },
    Password:           { displayName: "Password" },
    Instance:           { displayName: "Instance" }
  },
  "File Connector - Engine Tier": {
    dcName_:            { displayName: "Name", isRequired: true },
    dcDescription_:     { displayName: "Description" }
  }
};

const bridgeNameToParams = {
  "IBM InfoSphere DB2 Connector": {
    includeTables:            { displayName: "Include tables", type: "BOOLEAN", default: true },
    includeViews:             { displayName: "Include views", type: "BOOLEAN", default: true },
    includeNicknames:         { displayName: "Include nicknames", type: "BOOLEAN", default: true },
    includeAliases:           { displayName: "Include aliases", type: "BOOLEAN", default: true },
    importXmlAsLob:           { displayName: "XML columns as LOBs", type: "BOOLEAN", default: true },
    IncludeSystemObjects:     { displayName: "Include system objects", type: "BOOLEAN", default: false },
    ImportAssetsAsDatabases:  { displayName: "Import assets as&#xa;databases from z/OS", type: "BOOLEAN", default: false },
    SchemaNameFilter:         { displayName: "Schema name filter" },
    UseRegexInSchemaNameFilter: { displayName: "Use regular expression in schema&#xa;name filter", type: "BOOLEAN", default: false },
    TableNameFilter:          { displayName: "Table name filter" },
    AssetsToImport:           { displayName: "Assets to import" },
    Asset_description_already_exists: { displayName: "If an asset description already exists", default: "Replace_existing_description" },
    IgnoreTableAccessErrors:  { displayName: "Ignore table access&#xa;errors", type: "BOOLEAN", default: false },
    "AP_Host system name":    { displayName: "Host system name", isRequired: true },
    "AP_Database name":       { displayName: "Database name" }
  },
  "File Connector - Engine Tier": {
    DirectoryContents:        { displayName: "Assets to import" },
    ImportFileStructure:      { displayName: "Import file structure", type: "BOOLEAN", default: true },
    IgnoreAccessError:        { displayName: "Ignore metadata access errors", type: "BOOLEAN", default: false },
    Asset_description_already_exists: { displayName: "If an asset description already exists", default: "Replace_existing_description" },
    Identity_HostSystem:      { displayName: "Host system name", isRequired: true }
  }

};

/**
 * Setup the context for IMAM on the particular server being used -- this MUST be run before any other functionality
 * 
 * @param {string} user - the username of a user with the role of Common Metadata Administrator or Common Metadata Importer
 * @param {string} password - the user's password
 * @param {string} services - name of the services tier server
 * @param {string} port - port number to use on the services tier server
 * @param {string} engine - name of the engine tier server
 */
exports.setCtx = function(user, password, services, port, engine) {
  if (!test('-f', "/.dshome")) {
    throw new Error("Unable to find /.dshome -- this does not appear to be the engine tier.");
  }
  exports.ctx.dshome = cat("/.dshome").replace("\n", "");
  if (user === undefined || user === "" || password === undefined || password === "") {
    throw new Error("Incomplete authentication information -- missing username or password (or both).");
  }
  exports.ctx.user = user;
  exports.ctx.password = password;
  if (services === undefined || services === "" || port === undefined || port === "" || engine === undefined || engine === "") {
    throw new Error("Incomplete connectivity information -- missing services, port or engine tier name.");
  }
  exports.ctx.services = services;
  exports.ctx.port = port;
  exports.ctx.engine = engine;
}

/**
 * Retrieves a list of the bridges that can currently be handled by this module
 *
 * @returns {string[]} a list of the bridge names that are currently implemented in the module
 */
exports.getImplementedBridges = function() {
  return [
    "IBM InfoSphere DB2 Connector",
    "File Connector - Engine Tier"
  ];
}

/**
 * @private
 */
function _callCLI(command) {
  var cmd = exports.ctx.dshome
          + "/../../ASBNode/bin/imam.sh"
          + " -u " + exports.ctx.user
          + " -w " + exports.ctx.password
          + " -s " + exports.ctx.services
          + " -p " + exports.ctx.port;
  if (command.indexOf("import") > -1) {
    cmd = cmd + " -mn " + exports.ctx.engine;
  }
  cmd = cmd + " " + command;
  return exec(cmd, {silent: true, "shell": "/bin/bash"});
}

/**
 * @private
 */
function _getValueOrDefault(val, def) {
  return (val === undefined) ? def : val;
}

/**
 * @namespace
 */

/**
 * @constructor
 */
function ImportParameters(bridgeName, bridgeVersion) {
  this.doc = new xmldom.DOMImplementation().createDocument(null, "ImportParameters", null);
  this.doc.documentElement.setAttribute("bridgeId", bridgeNameToId[bridgeName] + "__" + bridgeVersion.substring(0, bridgeVersion.indexOf("_")));
  this.doc.documentElement.setAttribute("bridgeVersion", bridgeVersion);
  this.doc.documentElement.setAttribute("release", "11.5.0.1");
  this.doc.documentElement.setAttribute("bridgeDisplayName", bridgeName);
  this.doc.normalize();
}
ImportParameters.prototype = {

  doc: null,

  /**
   * Retrieve the ImportParameters document
   * 
   * @function
   */
  getImportParametersDoc: function() {
    return this.doc;
  },

  /**
   * Add the specified parameter to the import
   *
   * @function
   * @param {string} displayName
   * @param {string} id
   * @param {string} [type]
   * @param {string} value
   */
  addParameter: function(displayName, id, type, value) {
    
    var nIP = this.doc.getElementsByTagName("ImportParameters")[0];
    
    var eP = this.doc.createElement("Parameter");
    eP.setAttribute("displayName", displayName);
    eP.setAttribute("id", id);
    if (type !== undefined && type !== null && type !== "") {
      eP.setAttribute("type", type);
    }
    // TODO: do we need to include the "isRequired" attribute for it to work?
    var eV = this.doc.createElement("value");
    var val = this.doc.createTextNode(value);
    eV.appendChild(val);
    eP.appendChild(eV);
    nIP.appendChild(eP);

  }

};

/**
 * Create or update an import area -- necessary before any tasks can be executed
 *
 * @param {string} name - name of the import area
 * @param {string} description - description of the import area
 */
exports.createOrUpdateImportArea = function(name, description, type, bCreate) {

  // TODO: construct XML necessary to actually create the import area
  var paramFile = "";

  var result = ""
  if (bCreate) {
    result = _callCLI("-a import -i " + name + " -ad " + description + " -id " + description + " -pf " + paramFile);
  } else {
    result = _callCLI("-a reimport -i " + name);
  }

}

/**
 * Get a list of import areas
 *
 * @return {string[]} an array of import area names
 */
exports.getImportAreaList = function() {

  var result = _callCLI("-a list -t area -nof");

  var aIAs = [];
  var aResults = result.split("\n");
  for (var i = 0; i < aResults.length; i++) {
    if (aResults[i] !== "") {
      aIAs.push(aResults[i]);
    }
  }

  return aIAs;

}

/**
 * Returns a template (list of headers) for the bridge specified
 *
 * @param {string} bridgeName
 * @param {Workbook} [wb] - an optional workbook into which to add this template
 * @returns Workbook an Excel Workbook with the template
 */
exports.getTemplateForBridge = function(bridgeName, wb) {

  if (wb === undefined || wb === null) {
    wb = new xl.Workbook({
      jszip: {
        compression: 'DEFLATE'
      },
      defaultFont: {
        size: 12,
        name: 'Calibri',
        color: '000000'
      },
      dateFormat: 'yyyy/m/d hh:mm:ss'});
  }
  var ws = wb.addWorksheet(bridgeName, {'sheetFormat': {'defaultColWidth': 16}});

  var headerStyle = wb.createStyle({
    font: {
      bold: true,
      color: 'FFFFFF'
    }, 
    fill: {
      type: 'pattern',
      patternType: 'solid',
      fgColor: '000000'
    }
  });
  var requiredStyle = wb.createStyle({
    font: {
      bold: true,
      italics: true,
      color: 'FFFFFF'
    },
    fill: {
      type: 'pattern',
      patternType: 'solid',
      fgColor: 'C00000'
    }
  });
  var hiddenStyle = wb.createStyle({
    font: {
      size: 8,
      color: 'FAFAFA'
    },
    fill: {
      type: 'pattern',
      patternType: 'solid',
      fgColor: '000000'
    }
  });

  if (!bridgeNameToConnectorParams.hasOwnProperty(bridgeName)) {
    throw new Error("Unable to find a bridge named '" + bridgeName + "'.");
  }
  var dcnParams = bridgeNameToConnectorParams[bridgeName];
  var bridgeParams = bridgeNameToParams[bridgeName];

  var aHeader = [];

  // First row: output the unique ID of the parameter
  // Second row: output the user-friendly display name (in bold)
  // Third row: any default values / lists of valid values, as an example

  var iCellCount = 1;
  for (var key in dcnParams) {
    if (dcnParams.hasOwnProperty(key)) {

      ws.cell(1, iCellCount).string("DCN_" + key).style(hiddenStyle);
      if (dcnParams[key].hasOwnProperty("isRequired")) {
        ws.cell(2, iCellCount).string(dcnParams[key].displayName).style(requiredStyle);
      } else {
        ws.cell(2, iCellCount).string(dcnParams[key].displayName).style(headerStyle);
      }
      ws.column(iCellCount).setWidth(Math.max(16, dcnParams[key].displayName.length));
      if (dcnParams[key].hasOwnProperty("default")) {
        ws.cell(3, iCellCount).bool(dcnParams[key].default);
      }
      iCellCount++;

    }
  }

  for (var key in bridgeParams) {
    if (bridgeParams.hasOwnProperty(key)) {

      ws.cell(1, iCellCount).string("P_" + key).style(hiddenStyle);
      if (bridgeParams[key].hasOwnProperty("isRequired")) {
        ws.cell(2, iCellCount).string(bridgeParams[key].displayName).style(requiredStyle);  
      } else {
        ws.cell(2, iCellCount).string(bridgeParams[key].displayName).style(headerStyle);
      }
      ws.column(iCellCount).setWidth(Math.max(16, bridgeParams[key].displayName.length));
      if (key === "Asset_description_already_exists") {
        var alpha = xl.getExcelAlpha(iCellCount);
        ws.addDataValidation({
          type: 'list',
          allowBlank: true,
          showDropDown: true,
          sqref: alpha + '3',
          formulas: [
              'Replace_existing_description,Keep_existing_description'
          ]
        });
        ws.cell(3, iCellCount).string('Replace_existing_description');
      } else if (bridgeParams[key].hasOwnProperty("default")) {
        ws.cell(3, iCellCount).bool(bridgeParams[key].default);
      }
      iCellCount++;

    }
  }

  ws.row(1).hide();   // Hide the internal ID row
  ws.row(2).freeze(); // Freeze the human-readable heading

  return wb;

}
