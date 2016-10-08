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
 * @file BridgeFactory class -- for encapsulating information about metadata bridges and creating them when requested
 * @license Apache-2.0
 */

/**
 * @namespace
 */
class BridgeFactory {

  constructor() { }

  /**
   * Retrieves a list of the bridges that can currently be handled by this module
   *
   * @returns {string[]} a list of the bridge names that are currently implemented in the module
   */
  static getImplementedBridges() {
    return [
      "Amazon S3",
      "IBM InfoSphere DB2 Connector",
      "File Connector - Engine Tier",
      "File Connector - HDFS"
    ];
  }

  static getAssetTypeFromBridgeName(bridgeName) {
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
    if (!bridgeNameToAssetType.hasOwnProperty(bridgeName)) {
      throw new Error("Unable to find a bridge named '" + bridgeName + "'.");
    }
    return bridgeNameToAssetType[bridgeName];
  }

  static getBridgeId(bridgeName, bridgeVersion) {
    const bridgeNameToId = {
      "Amazon S3": "CAS/AmazonS3",
      "File Connector - Engine Tier": "CAS/LocalFileConnector",
      "File Connector - HDFS": "CAS/HDFSFileConnector",
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
    if (!bridgeNameToId.hasOwnProperty(bridgeName)) {
      throw new Error("Unable to find a bridge named '" + bridgeName + "'.");
    }
    return bridgeNameToId[bridgeName] + "__" + bridgeVersion.substring(0, bridgeVersion.indexOf("_"));
  }

  static getBridgeVersion(bridgeName) {
    const bridgeNameToVersion = {
      "Amazon S3": "1.0_1.0",
      "File Connector - Engine Tier": "1.6_1.0",
      "File Connector - HDFS": "1.6_1.0",
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
    if (!bridgeNameToVersion.hasOwnProperty(bridgeName)) {
      throw new Error("Unable to find a bridge named '" + bridgeName + "'.");
    }
    return bridgeNameToVersion[bridgeName];
  }

  static getConnectorParams(bridgeName) {
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
      },
      "File Connector - HDFS": {
        dcName_:            { displayName: "Name", isRequired: true },
        dcDescription_:     { displayName: "Description" },
        FileSystem:         { displayName: "File system", isRequired: true, default: 1 },    // 1 = WebHDFS
        ssl:                { displayName: "Use SSL (HTTPS)", type: "BOOLEAN", default: "false" },
        Kerberos:           { displayName: "Use Kerberos", type: "BOOLEAN", default: "false" },
        UseKeytab:          { displayName: "Use keytab", type: "BOOLEAN", default: "false" },
        Keytab:             { displayName: "Keytab" },
        UseCustomURL:       { displayName: "Use custom URL", type: "BOOLEAN", default: "false" },
        CustomURL:          { displayName: "Custom URL" },
        Host:               { displayName: "Host", isRequired: true },
        Port:               { displayName: "Port" },
        Username:           { displayName: "User name", isRequired: true },
        Password:           { displayName: "Password", isRequired: true }
      }
    };
    if (!bridgeNameToConnectorParams.hasOwnProperty(bridgeName)) {
      throw new Error("Unable to find a bridge named '" + bridgeName + "'.");
    }
    return bridgeNameToConnectorParams[bridgeName];
  }

  static getBridgeParams(bridgeName) {
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
      },
      "File Connector - HDFS": {
        DirectoryContents:        { displayName: "Assets to import" },
        ImportFileStructure:      { displayName: "Import file structure", type: "BOOLEAN", default: "False" },
        IgnoreAccessError:        { displayName: "Ignore metadata access errors", type: "BOOLEAN", default: "false" },
        Asset_description_already_exists: { displayName: "If an asset description already exists", default: "Replace_existing_description" },
        Identity_HostSystem:      { displayName: "Host system name", isRequired: true }
      }
    
    };
    if (!bridgeNameToParams.hasOwnProperty(bridgeName)) {
      throw new Error("Unable to find a bridge named '" + bridgeName + "'.");
    }
    return bridgeNameToParams[bridgeName];
  }

}

module.exports = BridgeFactory;
