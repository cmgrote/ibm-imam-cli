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
 * @requires exceljs
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

const bridgeNameToVersion = {
  "Amazon S3": "",
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
    
    var eP = this.doc.createElement("Parameter");
    eP.setAttribute("displayName", displayName);
    eP.setAttribute("id", id);
    var eV = this.doc.createElement("value");
    var val = this.doc.createTextNode(_getValueOrDefault(value, ""));
    eV.appendChild(val);
    eP.appendChild(eV);

    if (location === undefined || location === null) {
      var nIP = this.doc.getElementsByTagName("ImportParameters")[0];
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

    var nIP = this.doc.getElementsByTagName("ImportParameters")[0];

    var eCP = this.doc.createElement("CompositeParameter");
    eCP.setAttribute("isRequired", "true");
    eCP.setAttribute("displayName", "Data connection");
    eCP.setAttribute("id", "DataConnection");
    eCP.setAttribute("type", "DATA_CONNECTION");

    for (var i = 0; i < dcnParamsList.length; i++) {
      var paramObj = dcnParamsList[i];
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

  var aIAs = exports.getImportAreaList();
  bCreate = (aIAs.indexOf(name) == -1);

  var result = ""
  if (bCreate) {
    var paramFile = "/tmp/" + name.replace(" ", "_") + ".xml";
    exports.buildParameterXML(paramFile, bridgeName, dcnParams, bridgeParams);
    console.log("Creating new import area '" + name + "' with: " + paramFile);
    result = _callCLI("-a import -i " + name + " -ad \"" + description + "\" -id \"Initial import on " + new Date() + "\" -pf " + paramFile);
    if (result.code == 0) {
      rm(paramFile);
    }
  } else {
    console.log("Re-importing existing area '" + name + "'.");
    result = _callCLI("-a reimport -i " + name);
  }

  return result;

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
    wb = new Excel.Workbook();
  }
  var ws = wb.addWorksheet(bridgeName);

  var hiddenStyle = {
    font: { size: 8, color: {argb: 'FFFAFAFA'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF000000'} }
  };

  if (!bridgeNameToConnectorParams.hasOwnProperty(bridgeName)) {
    throw new Error("Unable to find a bridge named '" + bridgeName + "'.");
  }
  var dcnParams = bridgeNameToConnectorParams[bridgeName];
  var bridgeParams = bridgeNameToParams[bridgeName];

  // First row: output the unique ID of the parameter
  // Second row: output the user-friendly display name (in bold)
  // Third row: any default values / lists of valid values, as an example

  var iCellCount = 1;

  // First the Import Area details
  var iaStyle = {
    font: { bold: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF325C80'} }
  };
  var requiredStyle = {
    font: { bold: true, italic: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF4178BE'} }
  };
  var optionalStyle = {
    font: { italic: true, color: {argb: 'FF325C80'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF7CC7FF'} }
  };
  var iAreaStart = 1;
  var iaDetails = { name: "Name", desc: "Description" };
  for (var key in iaDetails) {
    if (iaDetails.hasOwnProperty(key)) {

      var col = ws.getColumn(iCellCount);
      var cellId = ws.getCell(1, iCellCount);
      if (iAreaStart == iCellCount) {
        var cellHeading = ws.getCell(2, iCellCount);
        cellHeading.style = iaStyle;
        cellHeading.value = "Import Area";
      }
      var cellName = ws.getCell(3, iCellCount);

      cellId.value = "IA_" + key;
      cellId.style = hiddenStyle;

      cellName.value = iaDetails[key];
      cellName.style = requiredStyle;
      col.width = Math.max(16);
      iCellCount++;

    }
  }
  ws.mergeCells(2, iAreaStart, 2, iCellCount - 1);

  // Then the Data Connection details
  var dcnStyle = {
    font: { bold: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF2D660A'} }
  };
  requiredStyle = {
    font: { bold: true, italic: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF4B8400'} }
  };
  optionalStyle = {
    font: { italic: true, color: {argb: 'FF2D660A'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFB4E051'} }
  };
  iAreaStart = iCellCount;
  for (var key in dcnParams) {
    if (dcnParams.hasOwnProperty(key)) {

      var col = ws.getColumn(iCellCount);
      var cellId = ws.getCell(1, iCellCount);
      if (iAreaStart == iCellCount) {
        var cellHeading = ws.getCell(2, iCellCount);
        cellHeading.style = dcnStyle;
        cellHeading.value = "Data Connection";
      }
      var cellName = ws.getCell(3, iCellCount);
      var cellEx = ws.getCell(4, iCellCount);

      cellId.value = "DCN_" + key;
      cellId.style = hiddenStyle;

      cellName.value = dcnParams[key].displayName;
      if (dcnParams[key].hasOwnProperty("isRequired")) {
        cellName.style = requiredStyle;
      } else {
        cellName.style = optionalStyle;
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
  var bridgeStyle = {
    font: { bold: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF006D5D'} }
  };
  requiredStyle = {
    font: { bold: true, italic: true, color: {argb: 'FFFFFFFF'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF008571'} }
  };
  optionalStyle = {
    font: { italic: true, color: {argb: 'FF006D5D'} },
    fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF6EEDD8'} }
  };
  iAreaStart = iCellCount;
  for (var key in bridgeParams) {
    if (bridgeParams.hasOwnProperty(key)) {

      var col = ws.getColumn(iCellCount);
      var cellId = ws.getCell(1, iCellCount);
      if (iAreaStart == iCellCount) {
        var cellHeading = ws.getCell(2, iCellCount);
        cellHeading.style = bridgeStyle;
        cellHeading.value = "Bridge-specific parameters";
      }
      var cellName = ws.getCell(3, iCellCount);
      var cellEx = ws.getCell(4, iCellCount);

      cellId.value = "P_" + key;
      cellId.style = hiddenStyle;

      cellName.value = bridgeParams[key].displayName;
      if (bridgeParams[key].hasOwnProperty("isRequired")) {
        cellName.style = requiredStyle;
      } else {
        cellName.style = optionalStyle;
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
    {state: 'frozen', xSplit: 0, ySplit: 3 }
  ];

  return wb;

}

/**
 * Builds the parameter XML needed by imam.sh
 *
 * @param {string} filename - name of the XML file to produce
 * @param {string} bridgeName - name of the bridge for which the XML file needs to be created
 * @param {Object[]} dcnParamList - array of objects describing the data connection, each with 'id', 'displayName' and 'value' properties
 * @param {Object[]} paramList - array of objects describing bridge-specific options, each with 'id', 'displayName', and 'value' properties
 */
exports.buildParameterXML = function(filename, bridgeName, dcnParamList, paramList) {

  var ip = new ImportParameters(bridgeName, bridgeNameToVersion[bridgeName]);
  ip.addDataConnection(dcnParamList);
  for (var i = 0; i < paramList.length; i++) {
    var param = paramList[i];
    ip.addParameter(param.id, param.displayName, param.value);
  }

  var output = pd.xml(new xmldom.XMLSerializer().serializeToString(ip.getImportParametersDoc()));

  var options = {
    "encoding": 'utf8',
    "mode": 0o600,
    "flag": 'w'
  }
  fs.writeFileSync(filename, output, options);

}

/**
 * @private
 */
function _prepValue(id, value) {
  
  var val = "";
  
  if (id === "DirectoryContents") { // file
    
    var aVals = value.split(";");
    for (var i = 0; i < aVals.length; i++) {
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
      var aVals = value.split(";");
      for (var i = 0; i < aVals.length; i++) {
        var oneVal = aVals[i];
        var count = (oneVal.match(/\|/g) || []).length;
        if (count == 0) {
          val = val + ";database[" + oneVal + "]";
        } else if (count == 1) {
          val = val + ";schema[" + oneVal + "]";
        } else if (count == 2) {
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

  var wb = new Excel.Workbook();
  wb.xlsx.readFile(filename).then(function() {
    wb.eachSheet(function(ws, sheetId) {

      var paramIds = ws.getRow(1).values;
      var paramNames = ws.getRow(3).values;

      ws.eachRow(function(row, rowNumber) {
        
        if (rowNumber > 3) { // skip first three rows, these are just header information
          
          var importName = "";
          var importDesc = "";
          var rowVals = row.values;
          var dcnParams = [];
          var params = [];
          for (var i = 0; i < paramIds.length; i++) {
            var id = paramIds[i];
            if (id !== undefined) {
              var name = paramNames[i];
              var value = rowVals[i];
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
          callback(exports.createOrUpdateImportArea(importName, importDesc, ws.name, dcnParams, params));

        }

      });

    });

  });

}

/**
 * This callback is invoked as the result of processing an Excel file.
 * @callback processCallback
 * @param {Object} result - the result object, as returned by module:shelljs~exec
 */
