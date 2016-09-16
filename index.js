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
 * @file Re-usable functions for interacting with IMAM via the command-line
 * @license Apache-2.0
 * @requires xmldom
 * @requires xpath
 * @requires shelljs
 * @requires fs-extra
 * @requires pretty-data
 * @requires exceljs
 */

/**
 * @module ibm-imam-cli
 */

const xmldom = require('xmldom');
require('shelljs/global');
const fs = require('fs-extra');
const pd = require('pretty-data').pd;
const Excel = require('exceljs');

exports.ctx = {
  dshome: "",
  user: "",
  password: "",
  services: "",
  port: "",
  engine: ""
};

const bridgeNameToId = {
  "Amazon S3": "CAS/AmazonS3",
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

const bridgeNameToVersion = {
  "Amazon S3": "1.0_1.0",
  "File Connector - Engine Tier": "1.6_1.0",
  "File Connector - HDFS": "",
  "HDFS": "",
  "Hive Connector": "",
  "IBM Cognos TM1": "",
  "IBM Cognos TM1 Connector": "",
  "IBM InfoSphere DB2 Connector": "9.1_1.0",
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

const bridgeNameToAssetType = {
  "Amazon S3": "file",
  "File Connector - Engine Tier": "file",
  "File Connector - HDFS": "file",
  "HDFS": "file",
  "Hive Connector": "database",
  "IBM Cognos TM1": "database",
  "IBM Cognos TM1 Connector": "database",
  "IBM InfoSphere DB2 Connector": "database",
  "IBM InfoSphere Master Data Management": "database",
  "IBM InfoSphere Streams": "file",
  "IBM Netezza Connector": "database",
  "JDBC Connector": "database",
  "ODBC Connector": "database",
  "XSD": "file",
  "Oracle Connector 11g": "database",
  "Oracle Connector 12c": "database",
  "Greenplum connector": "database",
  "Teradata Connector": "database"
};

const bridgeNameToConnectorParams = {
  "Amazon S3": {
    dcName_:            { displayName: "Name", isRequired: true },
    dcDescription_:     { displayName: "Descripion", isRequired: true },
    Region:             { displayName: "Region" },
    UseCredentialsFile: { displayName: "Use credentials file", type: "BOOLEAN", default: "true" },
    CredentialsFile:    { displayName: "Credentials file", isRequired: true },
    Username:           { displayName: "Access key", isRequired: true },
    Password:           { displayName: "Secret key", isRequired: true }
  },
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
  "Amazon S3": {
    S3Bucket:                 { displayName: "Amazon S3 bucket", isRequired: true },
    S3BucketContents:         { displayName: "S3 bucket contents" },
    ImportFileStructure:      { displayName: "Import file structure", type: "BOOLEAN", default: "True" },
    IgnoreMetadataAccessErrors: { displayName: "Ignore metadata access errors", type: "BOOLEAN", default: "False" },
    Asset_description_already_exists: { displayName: "If an asset description already exists", default: "Replace_existing_description" },
    "AP_Host system name":    { displayName: "Host system name", isRequired: true }
  },
  "IBM InfoSphere DB2 Connector": {
    includeTables:            { displayName: "Include tables", type: "BOOLEAN", default: "True" },
    includeViews:             { displayName: "Include views", type: "BOOLEAN", default: "True" },
    includeNicknames:         { displayName: "Include nicknames", type: "BOOLEAN", default: "True" },
    includeAliases:           { displayName: "Include aliases", type: "BOOLEAN", default: "True" },
    importXmlAsLob:           { displayName: "XML columns as LOBs", type: "BOOLEAN", default: "True" },
    IncludeSystemObjects:     { displayName: "Include system objects", type: "BOOLEAN", default: "False" },
    ImportAssetsAsDatabases:  { displayName: "Import assets as&#xa;databases from z/OS", type: "BOOLEAN", default: "False" },
    SchemaNameFilter:         { displayName: "Schema name filter" },
    UseRegexInSchemaNameFilter: { displayName: "Use regular expression in schema&#xa;name filter", type: "BOOLEAN", default: "False" },
    TableNameFilter:          { displayName: "Table name filter" },
    AssetsToImport:           { displayName: "Assets to import" },
    Asset_description_already_exists: { displayName: "If an asset description already exists", default: "Replace_existing_description" },
    IgnoreTableAccessErrors:  { displayName: "Ignore table access&#xa;errors", type: "BOOLEAN", default: "False" },
    "AP_Host system name":    { displayName: "Host system name", isRequired: "True" },
    "AP_Database name":       { displayName: "Database name" }
  },
  "File Connector - Engine Tier": {
    DirectoryContents:        { displayName: "Assets to import" },
    ImportFileStructure:      { displayName: "Import file structure", type: "BOOLEAN", default: "True" },
    IgnoreAccessError:        { displayName: "Ignore metadata access errors", type: "BOOLEAN", default: "False" },
    Asset_description_already_exists: { displayName: "If an asset description already exists", default: "Replace_existing_description" },
    Identity_HostSystem:      { displayName: "Host system name", isRequired: "True" }
  }

};

/**
 * Retrieves a list of the bridges that can currently be handled by this module
 *
 * @returns {string[]} a list of the bridge names that are currently implemented in the module
 */
exports.getImplementedBridges = function() {
  return [
    "Amazon S3",
    "IBM InfoSphere DB2 Connector",
    "File Connector - Engine Tier"
  ];
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
  if (services === undefined || services === "" || port === undefined || port === "") {
    throw new Error("Incomplete connectivity information -- missing services tier name or port.");
  }
  exports.ctx.services = services;
  exports.ctx.port = port;
  exports.ctx.engine = engine;
};

/**
 * @private
 */
function _callCLI(command) {
  let cmd = exports.ctx.dshome +
          "/../../ASBNode/bin/imam.sh" +
          " -u " + exports.ctx.user +
          " -w " + exports.ctx.password +
          " -s " + exports.ctx.services +
          " -p " + exports.ctx.port;
  if (command.indexOf("-a import") > -1) {
    cmd = cmd + " -mn " + exports.ctx.engine;
  }
  cmd = cmd + " " + command;
  //console.log("Calling: " + cmd);
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
   * @param {string} id
   * @param {string} displayName
   * @param {string} value
   * @param {Node} [location] - the XML location at which to add the parameter
   */
  addParameter: function(id, displayName, value, location) {
    
    const eP = this.doc.createElement("Parameter");
    eP.setAttribute("displayName", displayName);
    eP.setAttribute("id", id);
    const eV = this.doc.createElement("value");
    let val = null;
    if (id.toUpperCase().indexOf("PASSWORD") !== -1) {
      const encrypted = exec(exports.ctx.dshome + "/../../ASBNode/bin/encrypt.sh " + _getValueOrDefault(value, ""), {silent: true, "shell": "/bin/bash"});
      val = this.doc.createTextNode(encrypted.stdout.replace("\n", ""));
    } else {
      val = this.doc.createTextNode(_getValueOrDefault(value, ""));
    }
    eV.appendChild(val);
    eP.appendChild(eV);

    if (location === undefined || location === null) {
      const nIP = this.doc.getElementsByTagName("ImportParameters")[0];
      nIP.appendChild(eP);
    } else {
      location.appendChild(eP);
    }

  },

  /**
   * Add the specified data connection parameters to the import
   *
   * @function
   * @param {Object[]} dcnParamsList - an array of objects, each object having an 'id', 'displayName' and 'value'
   */
  addDataConnection: function(dcnParamsList) {

    const nIP = this.doc.getElementsByTagName("ImportParameters")[0];

    const eCP = this.doc.createElement("CompositeParameter");
    eCP.setAttribute("isRequired", "true");
    eCP.setAttribute("displayName", "Data connection");
    eCP.setAttribute("id", "DataConnection");
    eCP.setAttribute("type", "DATA_CONNECTION");

    for (let i = 0; i < dcnParamsList.length; i++) {
      const paramObj = dcnParamsList[i];
      this.addParameter(paramObj.id, paramObj.displayName, paramObj.value, eCP);
    }

    nIP.appendChild(eCP);

  }

};

/**
 * Create or update an import area -- necessary before any tasks can be executed
 *
 * @param {string} name - name of the import area
 * @param {string} description - description of the import area
 * @param {string} bridgeName - name of the bridge to use for the import area
 * @param {Object[]} dcnParams - array of data connection parameters (each object having an 'id', 'displayName', and 'value')
 * @param {Object[]} bridgeParams - array of bridge-specific parameters (each object having an 'id', 'displayName', and 'value')
 */
exports.createOrUpdateImportArea = function(name, description, bridgeName, dcnParams, bridgeParams) {

  const areas = exports.getImportAreaList();
  const bCreate = (!areas.hasOwnProperty(name));

  let result = "";
  if (bCreate) {
    const paramFile = "/tmp/" + name.replace(" ", "_") + ".xml";
    exports.buildParameterXML(paramFile, bridgeName, dcnParams, bridgeParams);
    console.log("Creating new import area '" + name + "' with: " + paramFile);
    result = _callCLI("-a import -i " + name + " -ad \"" + description + "\" -id \"Initial import on " + new Date() + "\" -pf " + paramFile);
    if (result.code === 0) {
      rm(paramFile);
    }
  } else {
    console.log("Re-importing existing area '" + name + "'.");
    result = _callCLI("-a reimport -i " + name);
  }

  return result;

};

/**
 * Get a list of import areas and their various last update dates
 *
 * @return {Object} an object with import area names as keys, and then within each of these a sub-object of timestamps 'importTS', 'analysisTS', 'previewTS', 'shareTS'
 */
exports.getImportAreaList = function() {

  const result = _callCLI("-a list -t area");

  const aAreas = {};

  const aLines = result.stdout.split("\n");
  let bFoundTableStart = false;
  let lastName = "";
  for (let i = 0; i < aLines.length; i++) {
    const line = aLines[i];
    if (line.startsWith("=")) {
      bFoundTableStart = true;
      continue;
    }
    if (bFoundTableStart) {
      const aTokens = line.split("|");
      if (aTokens.length > 4) {
        const name = aTokens[0].trim();
        const importDate = aTokens[1].trim();
        const analysisDate = aTokens[2].trim();
        const previewDate = aTokens[3].trim();
        const shareDate = aTokens[4].trim();
        if (!name.startsWith("___")) {
          if (name.length > 0) {
            lastName = name;
            aAreas[name] = {};
            aAreas[name].importTS = importDate;
            aAreas[name].analysisTS = analysisDate;
            aAreas[name].previewTS = previewDate;
            aAreas[name].shareTS = shareDate;
          } else {
            if (aAreas[lastName].importTS === undefined || aAreas[lastName].importTS === "") {
              aAreas[lastName].importTS = null;  
            } else {
              aAreas[lastName].importTS = new Date(aAreas[lastName].importTS + " " + importDate);
            }
            if (aAreas[lastName].analysisTS === undefined || aAreas[lastName].analysisTS === "") {
              aAreas[lastName].analysisTS = null;
            } else {
              aAreas[lastName].analysisTS = new Date(aAreas[lastName].analysisTS + " " + analysisDate);
            }
            if (aAreas[lastName].previewTS === undefined || aAreas[lastName].previewTS === "") {
              aAreas[lastName].previewTS = null;
            } else {
              aAreas[lastName].previewTS = new Date(aAreas[lastName].previewTS + " " + previewDate);
            }
            if (aAreas[lastName].shareTS === undefined || aAreas[lastName].shareTS === "") {
              aAreas[lastName].shareTS = null;
            } else {
              aAreas[lastName].shareTS = new Date(aAreas[lastName].shareTS + " " + shareDate);
            }
          }
        }
      }
    }
  }

  return aAreas;

};

/**
 * Returns a template (list of headers) for the bridge specified
 *
 * @param {string} bridgeName
 * @param {Workbook} [wb] - an optional workbook into which to add this template
 * @returns Workbook an Excel Workbook with the template
 */
exports.getTemplateForBridge = function(bridgeName, wb) {

  if (wb === undefined || wb === null) {
    wb = new Excel.Workbook();
  }
  const ws = wb.addWorksheet(bridgeName);

  const hiddenStyle = {
    font: { size: 8, color: {argb: 'FFFAFAFA'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF000000'} }
  };

  if (!bridgeNameToConnectorParams.hasOwnProperty(bridgeName)) {
    throw new Error("Unable to find a bridge named '" + bridgeName + "'.");
  }
  const dcnParams = bridgeNameToConnectorParams[bridgeName];
  const bridgeParams = bridgeNameToParams[bridgeName];

  // First row: output the unique ID of the parameter
  // Second row: output the user-friendly display name (in bold)
  // Third row: any default values / lists of valid values, as an example

  let iCellCount = 1;

  // First the Import Area details
  const iaStyle = {
    font: { bold: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF325C80'} }
  };
  const requiredStyleIA = {
    font: { bold: true, italic: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF4178BE'} }
  };
  /*const optionalStyleIA = {
    font: { italic: true, color: {argb: 'FF325C80'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF7CC7FF'} }
  };*/
  let iAreaStart = 1;
  const iaDetails = { name: "Name", desc: "Description" };
  for (const key in iaDetails) {
    if (iaDetails.hasOwnProperty(key)) {

      const col = ws.getColumn(iCellCount);
      const cellId = ws.getCell(1, iCellCount);
      if (iAreaStart === iCellCount) {
        const cellHeading = ws.getCell(2, iCellCount);
        cellHeading.style = iaStyle;
        cellHeading.value = "Import Area";
      }
      const cellName = ws.getCell(3, iCellCount);

      cellId.value = "IA_" + key;
      cellId.style = hiddenStyle;

      cellName.value = iaDetails[key];
      cellName.style = requiredStyleIA;
      col.width = Math.max(16);
      iCellCount++;

    }
  }
  ws.mergeCells(2, iAreaStart, 2, iCellCount - 1);

  // Then the Data Connection details
  const dcnStyle = {
    font: { bold: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF2D660A'} }
  };
  const requiredStyleDCN = {
    font: { bold: true, italic: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF4B8400'} }
  };
  const optionalStyleDCN = {
    font: { italic: true, color: {argb: 'FF2D660A'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFB4E051'} }
  };
  iAreaStart = iCellCount;
  for (const key in dcnParams) {
    if (dcnParams.hasOwnProperty(key)) {

      const col = ws.getColumn(iCellCount);
      const cellId = ws.getCell(1, iCellCount);
      if (iAreaStart === iCellCount) {
        const cellHeading = ws.getCell(2, iCellCount);
        cellHeading.style = dcnStyle;
        cellHeading.value = "Data Connection";
      }
      const cellName = ws.getCell(3, iCellCount);
      const cellEx = ws.getCell(4, iCellCount);

      cellId.value = "DCN_" + key;
      cellId.style = hiddenStyle;

      cellName.value = dcnParams[key].displayName;
      if (dcnParams[key].hasOwnProperty("isRequired")) {
        cellName.style = requiredStyleDCN;
      } else {
        cellName.style = optionalStyleDCN;
      }
      col.width = Math.max(16, dcnParams[key].displayName.length);
      if (dcnParams[key].hasOwnProperty("default")) {
        cellEx.value = dcnParams[key].default;
      }
      iCellCount++;

    }
  }
  ws.mergeCells(2, iAreaStart, 2, iCellCount - 1);

  // Then the bridge-specific details
  const bridgeStyle = {
    font: { bold: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF006D5D'} }
  };
  const requiredStyleBridge = {
    font: { bold: true, italic: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF008571'} }
  };
  const optionalStyleBridge = {
    font: { italic: true, color: {argb: 'FF006D5D'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF6EEDD8'} }
  };
  iAreaStart = iCellCount;
  for (const key in bridgeParams) {
    if (bridgeParams.hasOwnProperty(key)) {

      const col = ws.getColumn(iCellCount);
      const cellId = ws.getCell(1, iCellCount);
      if (iAreaStart === iCellCount) {
        const cellHeading = ws.getCell(2, iCellCount);
        cellHeading.style = bridgeStyle;
        cellHeading.value = "Bridge-specific parameters";
      }
      const cellName = ws.getCell(3, iCellCount);
      const cellEx = ws.getCell(4, iCellCount);

      cellId.value = "P_" + key;
      cellId.style = hiddenStyle;

      cellName.value = bridgeParams[key].displayName;
      if (bridgeParams[key].hasOwnProperty("isRequired")) {
        cellName.style = requiredStyleBridge;
      } else {
        cellName.style = optionalStyleBridge;
      }

      col.width = Math.max(16, bridgeParams[key].displayName.length);
      if (key === "Asset_description_already_exists") {
        cellEx.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Replace_existing_description,Keep_existing_description"']
        };
        cellEx.value = "Replace_existing_description";
      } else if (bridgeParams[key].hasOwnProperty("default")) {
        cellEx.value = bridgeParams[key].default;
      }
      iCellCount++;

    }
  }
  ws.mergeCells(2, iAreaStart, 2, iCellCount - 1);

  ws.getRow(1).hidden = true;
  ws.views = [
    {state: 'frozen', xSplit: 0, ySplit: 3, activeCell: 'A4' }
  ];

  return wb;

};

/**
 * Builds the parameter XML needed by imam.sh
 *
 * @param {string} filename - name of the XML file to produce
 * @param {string} bridgeName - name of the bridge for which the XML file needs to be created
 * @param {Object[]} dcnParamList - array of objects describing the data connection, each with 'id', 'displayName' and 'value' properties
 * @param {Object[]} paramList - array of objects describing bridge-specific options, each with 'id', 'displayName', and 'value' properties
 */
exports.buildParameterXML = function(filename, bridgeName, dcnParamList, paramList) {

  const ip = new ImportParameters(bridgeName, bridgeNameToVersion[bridgeName]);
  ip.addDataConnection(dcnParamList);
  for (let i = 0; i < paramList.length; i++) {
    const param = paramList[i];
    ip.addParameter(param.id, param.displayName, param.value);
  }

  const output = pd.xml(new xmldom.XMLSerializer().serializeToString(ip.getImportParametersDoc()));

  const options = {
    "encoding": 'utf8',
    "mode": 0o600,
    "flag": 'w'
  };
  fs.writeFileSync(filename, output, options);

};

/**
 * @private
 */
function _prepValue(id, value) {
  
  let val = "";
  
  if (id === "DirectoryContents" || id === "S3BucketContents") { // file
    
    const aVals = value.split(";");
    for (let i = 0; i < aVals.length; i++) {
      if (value.endsWith("/")) {
        val = val + ";folder[" + value + "]";
      } else {
        val = val + ";file[" + value + "]";
      }
    }
    if (val.length > 0) {
      val = val.substring(1);
    }
  
  } else if (id === "AssetsToImport") { // database

    if (value !== undefined && value !== "") {
      const aVals = value.split(";");
      for (let i = 0; i < aVals.length; i++) {
        const oneVal = aVals[i];
        const count = (oneVal.match(/\|/g) || []).length;
        if (count === 0) {
          val = val + ";database[" + oneVal + "]";
        } else if (count === 1) {
          val = val + ";schema[" + oneVal + "]";
        } else if (count === 2) {
          val = val + ";table[" + oneVal + "]";
        }
      }
      if (val.length > 0) {
        val = val.substring(1);
      }
    }

  } else { // by default, just return the value as-is
    val = value;
  }
  return val;
}

/**
 * Loads metadata from all of the sources listed in the specified Excel file -- which should have been produced first by the getTemplateForBridge function
 *
 * @see module:ibm-imam-cli~getTemplateForBridge
 * @param {string} filename - name of the .xlsx file containing host details, credentials, etc
 * @param {processCallback} callback - callback that handles the response of processing
 */
exports.loadMetadata = function(filename, callback) {

  const wb = new Excel.Workbook();
  wb.xlsx.readFile(filename).then(function() {
    wb.eachSheet(function(ws) {

      const paramIds = ws.getRow(1).values;
      const paramNames = ws.getRow(3).values;

      ws.eachRow(function(row, rowNumber) {
        
        if (rowNumber > 3) { // skip first three rows, these are just header information
          
          let importName = "";
          let importDesc = "";
          const rowVals = row.values;
          const dcnParams = [];
          const params = [];
          for (let i = 0; i < paramIds.length; i++) {
            let id = paramIds[i];
            if (id !== undefined) {
              const name = paramNames[i];
              const value = rowVals[i];
              if (id === "IA_name") {
                importName = value;
              } else if (id === "IA_desc") {
                importDesc = value;
              } else if (id.startsWith("DCN_")) {
                id = id.substring(4); // remove the "DCN_"
                dcnParams.push({ id: id, displayName: name, value: _prepValue(id, value) });
              } else {
                id = id.substring(2); // remove the "P_"
                params.push({ id: id, displayName: name, value: _prepValue(id, value) });
              }
            }
          }
          if (importName !== undefined && importName !== "") {
            callback(exports.createOrUpdateImportArea(importName, importDesc, ws.name, dcnParams, params), ws.name, dcnParams, params);
          } else {
            callback({code: 1, stdout: 'Missing import area name (required).'}, ws.name, dcnParams, params);
          }

        }

      });

    });

  });

};

exports.getAssetTypeFromBridgeName = function(bridgeName) {
  return bridgeNameToAssetType[bridgeName];
};

exports.getProjectParamsFromMetadataParams = function(assetType, dcnParams, bridgeParams) {

  let projectParams = null;

  if (assetType === "database") {

    const aDbNames = [];
    const aSchemaNames = [];
    const aTableNames = [];
    let dbFilter = "";
    let schemaFilter = "";
    let tableFilter = "";
    let hostname = "";

    for (let i = 0; i < dcnParams.length; i++) {
      if (dcnParams[i].id === 'Database') {
        dbFilter = dcnParams[i].value;
      }
    }
    for (let j = 0; j < bridgeParams.length; j++) {
      if (bridgeParams[j].id === 'AP_Host system name') {
        hostname = bridgeParams[j].value;
      } else if (bridgeParams[j].id === 'SchemaNameFilter') {
        schemaFilter = bridgeParams[j].value;
      } else if (bridgeParams[j].id === 'TableNameFilter') {
        tableFilter = bridgeParams[j].value;
      } else if (bridgeParams[j].id === 'AssetsToImport') {
        const aObjects = bridgeParams[j].value.split(";");
        for (let k = 0; k < aObjects.length; k++) {
          const obj = aObjects[k];
          if (obj.startsWith("database[")) {
            aDbNames.push(obj.substring("database[".length, obj.length - 1));
          } else if (obj.startsWith("schema[")) {
            aSchemaNames.push(obj.substring("schema[".length, obj.length - 1));
          } else if (obj.startsWith("table[")) {
            aTableNames.push(obj.substring("table[".length, obj.length - 1));
          }
        }
      }
    }

    projectParams = {
      hostname: hostname,
      dbNames: aDbNames,
      schemaNames: aSchemaNames,
      tableNames: aTableNames,
      dbFilter: dbFilter,
      schemaFilter: schemaFilter,
      tableFilter: tableFilter
    };

  } else if (assetType === "file") {

    // TODO: handle files

  }

  return projectParams;

};

/**
 * This callback is invoked as the result of processing an Excel file.
 * @callback processCallback
 * @param {Object} result - the result object, as returned by module:shelljs~exec
 * @param {string} bridgeName - name of the metadata bridge used for the load
 * @param {Object[]} dcnParams - array of data connection parameter objects that were used to load metadata, each with an 'id', 'displayName' and 'value'
 * @param {Object[]} bridgeParams - array of bridge-specific parameter objects that were used to load metadata, each with an 'id', 'displayName' and 'value'
 */
