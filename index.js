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
const shell = require('shelljs');
const fs = require('fs-extra');
const pd = require('pretty-data').pd;
const Excel = require('exceljs');

const BridgeFactory = require('./classes/bridge-factory');
const FileSchemaFactory = require('./classes/file-schema-factory');
const ImportParameters = require('./classes/import-parameters');

const ImamCLI = (function() {

  /**
   * @private
   */
  function _callCLI(envCtx, command) {
    let cmd = envCtx.asbhome +
            "/bin/imam.sh" +
            " -af " + envCtx.authFile;
    if (command.indexOf("-a import") > -1) {
      cmd = cmd + " -mn " + envCtx.engine.toLowerCase();
    }
    cmd = cmd + " " + command;
    //console.log("Calling: " + cmd);
    return shell.exec(cmd, {silent: true, "shell": "/bin/bash"});
  }

  /**
   * Create or update an import area -- necessary before any tasks can be executed
   *
   * @param {EnvironmentContext} envCtx - an environment context from ibm-iis-commons
   * @param {string} name - name of the import area
   * @param {string} description - description of the import area
   * @param {string} bridgeName - name of the bridge to use for the import area
   * @param {Object[]} dcnParams - array of data connection parameters (each object having an 'id', 'displayName', and 'value')
   * @param {Object[]} bridgeParams - array of bridge-specific parameters (each object having an 'id', 'displayName', and 'value')
   */
  const createOrUpdateImportArea = function(envCtx, name, description, bridgeName, dcnParams, bridgeParams) {
  
    const areas = getImportAreaList(envCtx);
    const bCreate = (!areas.hasOwnProperty(name));
  
    let result = "";
    if (bCreate) {
      const paramFile = "/tmp/" + name.replace(" ", "_") + ".xml";
      buildParameterXML(envCtx, paramFile, bridgeName, dcnParams, bridgeParams);
      console.log("Creating new import area '" + name + "' with: " + paramFile);
      result = _callCLI(envCtx, "-a import -i " + name + " -ad \"" + description + "\" -id \"Initial import on " + new Date() + "\" -pf " + paramFile);
      if (result.code === 0) {
        shell.rm(paramFile);
      }
    } else {
      console.log("Re-importing existing area '" + name + "'.");
      result = _callCLI(envCtx, "-a reimport -i " + name);
    }
  
    return result;
  
  };
  
  /**
   * Get a list of import areas and their various last update dates
   *
   * @param {EnvironmentContext} envCtx - an environment context from ibm-iis-commons
   * @return {Object} an object with import area names as keys, and then within each of these a sub-object of timestamps 'importTS', 'analysisTS', 'previewTS', 'shareTS'
   */
  const getImportAreaList = function(envCtx) {
  
    const result = _callCLI(envCtx, "-a list -t area");
  
    const aAreas = {};
  
    const aLines = result.stdout.split("\n");
    let bFoundTableStart = false;
    let bFoundAreaStart = false;
    let lastImportTS = "";
    let lastAnalysisTS = "";
    let lastPreviewTS = "";
    let lastShareTS = "";
    let lastName = "";
    for (let i = 0; i < aLines.length; i++) {
      const line = aLines[i];
      if (line.startsWith("=")) {
        bFoundTableStart = true;
        continue;
      }
      if (line.startsWith("_______")) {
        aAreas[lastName] = {};
        aAreas[lastName].importTS = new Date(lastImportTS.trim());
        aAreas[lastName].analysisTS = new Date(lastAnalysisTS.trim());
        aAreas[lastName].previewTS = new Date(lastPreviewTS.trim());
        aAreas[lastName].shareTS = new Date(lastShareTS.trim());
        bFoundAreaStart = true;
        lastImportTS = "";
        lastAnalysisTS = "";
        lastPreviewTS = "";
        lastShareTS = "";
        lastName = "";
        continue;
      }
      if (bFoundTableStart || bFoundAreaStart) {
        const aTokens = line.split("|");
        if (aTokens.length > 4) {
          lastName += aTokens[0].trim();
          lastImportTS += " " + aTokens[1].trim();
          lastAnalysisTS = " " + aTokens[2].trim();
          lastPreviewTS = " " + aTokens[3].trim();
          lastShareTS = " " + aTokens[4].trim();
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
  const getTemplateForBridge = function(bridgeName, wb) {
  
    if (wb === undefined || wb === null) {
      wb = new Excel.Workbook();
    }
    const ws = wb.addWorksheet(bridgeName);
  
    const hiddenStyle = {
      font: { size: 8, color: {argb: 'FFFAFAFA'} },
      fill: { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF000000'} }
    };
  
    const dcnParams = BridgeFactory.getConnectorParams(bridgeName);
    const bridgeParams = BridgeFactory.getBridgeParams(bridgeName);
  
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
   * @param {EnvironmentContext} envCtx - an environment context from ibm-iis-commons
   * @param {string} filename - name of the XML file to produce
   * @param {string} bridgeName - name of the bridge for which the XML file needs to be created
   * @param {Object[]} dcnParamList - array of objects describing the data connection, each with 'id', 'displayName' and 'value' properties
   * @param {Object[]} paramList - array of objects describing bridge-specific options, each with 'id', 'displayName', and 'value' properties
   */
  const buildParameterXML = function(envCtx, filename, bridgeName, dcnParamList, paramList) {
  
    const ip = new ImportParameters(envCtx, bridgeName, BridgeFactory.getBridgeVersion(bridgeName));
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
   * @param {EnvironmentContext} envCtx - an environment context from ibm-iis-commons
   * @param {string} filename - name of the .xlsx file containing host details, credentials, etc
   * @param {processCallback} callback - callback that handles the response of processing
   */
  const loadMetadata = function(envCtx, filename, callback) {
  
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
              callback(createOrUpdateImportArea(envCtx, importName, importDesc, ws.name, dcnParams, params), ws.name, dcnParams, params);
            } else {
              callback({code: 1, stdout: 'Missing import area name (required).'}, ws.name, dcnParams, params);
            }
  
          }
  
        });
  
      });
  
    });
  
  };
  
  const getProjectParamsFromMetadataParams = function(assetType, dcnParams, bridgeParams) {
  
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
   * Given DDL for defining one or more database tables, converts these into their corresponding IMAM-recognisable data formats
   *
   * @see module:ibm-imam-cli~getHeaderLineForTable
   * @param {string} ddlFile - path to the DDL file containing one or more CREATE TABLE statements
   * @returns FieldDefinitions with table names as keys, each being a sub-object with a 'header' (String) and 'columns' (String[]) properties
   */
  const getColumnDefinitionsFromDDL = function(ddlFile) {

    const aCreateTbls = FileSchemaFactory.getCreateTableStatementsFromDDL(ddlFile);
    const tablesToFields = {};

    for (let i = 0; i < aCreateTbls.length; i++) {
      const tblObj = FileSchemaFactory.getColumnDefinitionsFromCreateTableStatement(aCreateTbls[i]);
      tablesToFields[tblObj.table] = tblObj.columns;
    }

    return tablesToFields;

  };

  /**
   * Retrieves the header line for a given table name, from a set of converted field definitions
   *
   * @see module:ibm-imam-cli~getColumnDefinitionsFromDDL
   * @param {FieldDefinitions} tablesToFields - the set of converted field definitions from getColumnDefinitionsFromDDL
   * @param {string} tblName - the name of the table for which to get the header line
   * @param {string} [delimiter] - an optional delimiter to use (by default a |)
   * @returns String with the header line for a data file that will be IMAM-importable
   */
  const getHeaderLineForTable = function(tablesToFields, tblName, delimiter) {

    const ucaseTblName = tblName.toUpperCase();
    if (!tablesToFields.hasOwnProperty(ucaseTblName)) {
      throw new Error("Unable to find table name: " + ucaseTblName);
    }
    if (delimiter === undefined || delimiter === null || delimiter === "") {
      delimiter = "|";
    }

    const fieldDefinitions = tablesToFields[ucaseTblName];
    let header = "";
    for (let i = 0; i < fieldDefinitions.length; i++) {
      const colDefn = FileSchemaFactory.convertColumnDefinitionToFileSchemaFieldDefinition(fieldDefinitions[i]);
      header += colDefn + delimiter;
    }

    return header.substring(0, header.length - 1);

  };

  /**
   * Creates the contents for an OSH schema file for a given table name, from a set of converted field definitions
   *
   * @see module:ibm-imam-cli~getColumnDefinitionsFromDDL
   * @param {FieldDefinitions} tablesToFields - the set of converted field definitions from getColumnDefinitionsFromDDL
   * @param {string} tblName - the name of the table for which to create the OSH schema file
   * @param {string} [delimiter] - an optional delimiter to use (by default a |)
   * @param {boolean} [bHeader] - true if there is a header in the data file, false otherwise
   * @param {string} [escape] - the string that should be treated as an escape sequence for the delimiter (e.g. a double-quote)
   * @returns String with the contents for an OSH schema file that will be IMAM-importable
   */
  const getOSHSchemaForTable = function(tablesToFields, tblName, delimiter, bHeader, escape) {

    let oshSchema = "// FileStructure: file_format='delimited'";
    oshSchema += bHeader ? ", header='true'" : ", header='false'";
    if (escape !== undefined && escape !== null) {
      oshSchema += ", escape=";
      oshSchema += escape.length > 1 ? "\"" + escape + "\"" : "'" + escape + "'";
    }
    oshSchema += "\n" +
      "record { record_delim='\\n', delim='" + ((delimiter === undefined || delimiter === null) ? "|" : delimiter) + "', final_delim=end, null_field='', date_format='%yyyy-%mm-%dd', time_format='%hh:%nn:%ss', timestamp_format='%yyyy-%mm-%dd %hh:%nn:%ss' } (";

    const ucaseTblName = tblName.toUpperCase();
    if (!tablesToFields.hasOwnProperty(ucaseTblName)) {
      throw new Error("Unable to find table name: " + ucaseTblName);
    }

    const fieldDefinitions = tablesToFields[ucaseTblName];
    for (let i = 0; i < fieldDefinitions.length; i++) {
      const colDefn = FileSchemaFactory.convertColumnDefinitionToOSHSchemaFieldDefinition(fieldDefinitions[i]);
      oshSchema += "\n" +
        "    " + colDefn;
    }

    oshSchema += "\n" +
      ")";
    return oshSchema;

  };

  return {
    createOrUpdateImportArea: createOrUpdateImportArea,
    getImportAreaList: getImportAreaList,
    getTemplateForBridge: getTemplateForBridge,
    buildParameterXML: buildParameterXML,
    loadMetadata: loadMetadata,
    getProjectParamsFromMetadataParams: getProjectParamsFromMetadataParams,
    getColumnDefinitionsFromDDL: getColumnDefinitionsFromDDL,
    getHeaderLineForTable: getHeaderLineForTable,
    getOSHSchemaForTable: getOSHSchemaForTable
  };

})();

module.exports = ImamCLI;

/**
 * This callback is invoked as the result of processing an Excel file.
 * @callback processCallback
 * @param {Object} result - the result object, as returned by module:shelljs~exec
 * @param {string} bridgeName - name of the metadata bridge used for the load
 * @param {Object[]} dcnParams - array of data connection parameter objects that were used to load metadata, each with an 'id', 'displayName' and 'value'
 * @param {Object[]} bridgeParams - array of bridge-specific parameter objects that were used to load metadata, each with an 'id', 'displayName' and 'value'
 */

if (typeof require === 'function') {
  exports.ImportParameters = ImportParameters;
  exports.BridgeFactory = BridgeFactory;
  exports.FileSchemaFactory = FileSchemaFactory;
}
