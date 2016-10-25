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
 * @file FileSchemaFactory class -- for encapsulating information about creating a schema heading for files
 * @license Apache-2.0
 */

const fs = require('fs');

/**
 * @namespace
 */
class FileSchemaFactory {

  constructor() { }

  static getFileTypeForSQLType(sqlType) {
    // http://www.ibm.com/support/knowledgecenter/SSZJPZ_11.5.0/com.ibm.swg.im.iis.conn.s3.usage.doc/topics/r_metadata_for_rcp.html
    const bHasLength = (sqlType.indexOf("(") > 0);
    let sqlTypeAlone = sqlType;
    let sqlTypeLength = "";
    if (bHasLength) {
      sqlTypeAlone = sqlType.substring(0, sqlType.indexOf("("));
      sqlTypeLength = sqlType.substring(sqlType.indexOf("("));
    }
    const ucaseSQL = sqlTypeAlone.toUpperCase();
    const sqlTypeToFileType = {
      "CHAR": "Char",
      "DATE": "Date",
      "DECIMAL": "Numeric",
      "INTEGER": "Integer",
      "TIME": "Time",
      "TIMESTAMP": "Timestamp",
      "VARCHAR": "VarChar",
    };
    if (!sqlTypeToFileType.hasOwnProperty(ucaseSQL)) {
      throw new Error("Unsupported SQL data type: " + ucaseSQL);
    }
    return sqlTypeToFileType[ucaseSQL] + sqlTypeLength;
  }

  static getOSHSchemaTypeForSQLType(sqlType) {
    const bHasLength = (sqlType.indexOf("(") > 0);
    let sqlTypeAlone = sqlType;
    let sqlTypeLength = "";
    if (bHasLength) {
      sqlTypeAlone = sqlType.substring(0, sqlType.indexOf("("));
      sqlTypeLength = sqlType.substring(sqlType.indexOf("(") + 1, sqlType.indexOf(")"));
    }
    const ucaseSQL = sqlTypeAlone.toUpperCase();
    const sqlTypeToFileType = {
      "CHAR": "string",
      "DATE": "date",
      "DECIMAL": "decimal",
      "INTEGER": "int64",
      "TIME": "time",
      "TIMESTAMP": "timestamp",
      "VARCHAR": "string",
    };
    if (!sqlTypeToFileType.hasOwnProperty(ucaseSQL)) {
      throw new Error("Unsupported SQL data type: " + ucaseSQL);
    }
    let oshSchemaType = sqlTypeToFileType[ucaseSQL];
    if (sqlTypeLength !== "") {
      if (oshSchemaType === "string") {
        oshSchemaType += "[max=" + sqlTypeLength + "]";
      } else {
        oshSchemaType += "[" + sqlTypeLength + "]";
      }
    }
    return oshSchemaType;
  }

  static getCreateTableStatementsFromDDL(ddlFile) {
    const tblStatments = [];
    const ddlString = fs.readFileSync(ddlFile, 'utf8');
    const aLinesDDL = ddlString.split("\n");
    let currentTableDef = "";
    for (let i = 0; i < aLinesDDL.length; i++) {
      const line = aLinesDDL[i].trim().toUpperCase();
      if (line.startsWith("CREATE TABLE")) {
        if (currentTableDef !== "") {
          tblStatments.push(currentTableDef);
        }
        currentTableDef = line.replace(/\s\s+/g, ' ');
      } else if (!line.startsWith("--") && line !== "") {
        currentTableDef += line.replace(/\s\s+/g, ' ');
      }
      // Also ensure the very last create table statement is included
      if (aLinesDDL.length === (i + 1) && currentTableDef.startsWith("CREATE TABLE")) {
        tblStatments.push(currentTableDef);
      }
    }
    return tblStatments;
  }

  static getColumnDefinitionsFromCreateTableStatement(ddlCreateTable) {
    
    const iDefnStart = ddlCreateTable.indexOf("(");
    const iDefnEnd = ddlCreateTable.lastIndexOf(")");
    const tblName = ddlCreateTable.substring("CREATE TABLE ".length, iDefnStart);
    const tblDefn = ddlCreateTable.substring(iDefnStart + 1, iDefnEnd);
    const aNaiveColDefns = tblDefn.split(","); // not quiet so simple, since DECIMAL(5,2) will be split in the middle...
    const aActualColDefns = [];
    for (let i = 0; i < aNaiveColDefns.length; i++) {
      let candidateCol = aNaiveColDefns[i];
      if (candidateCol.indexOf("(") > 0) {
        // If we find an opening (, then greedily consume into the same column until we find the corresponding closing )
        while (candidateCol.indexOf(")") < 0) {
          candidateCol += "," + aNaiveColDefns[++i];
        }
      }
      if (!candidateCol.startsWith("PRIMARY KEY")) {
        aActualColDefns.push(candidateCol);
      }
    }
    return { table: tblName, columns: aActualColDefns };

  }

  static convertColumnDefinitionToFileSchemaFieldDefinition(ddlCol) {

    let remainder = ddlCol;
    const colName = remainder.substring(0, remainder.indexOf(" "));
    remainder     = remainder.substring(colName.length).trim();
    let colType = remainder;
    let extras = "";
    if (remainder.indexOf(" ") > 0) {
      colType = remainder.substring(0, remainder.indexOf(" "));
      extras = remainder.substring(colType.length).trim();
    }

    if (extras === "NOT NULL") {
      extras = "not nullable";
    } else {
      extras = "nullable";
    }

    return colName + ":" + FileSchemaFactory.getFileTypeForSQLType(colType) + " " + extras;

  }

  static convertColumnDefinitionToOSHSchemaFieldDefinition(ddlCol) {

    let remainder = ddlCol;
    const colName = remainder.substring(0, remainder.indexOf(" "));
    remainder     = remainder.substring(colName.length).trim();
    let colType = remainder;
    let extras = "";
    if (remainder.indexOf(" ") > 0) {
      colType = remainder.substring(0, remainder.indexOf(" "));
      extras = remainder.substring(colType.length).trim();
    }

    if (extras === "NOT NULL") {
      extras = "not nullable";
    } else {
      extras = "nullable";
    }

    return colName + ": " + extras + " " + FileSchemaFactory.getOSHSchemaTypeForSQLType(colType) + ";";

  }

}

module.exports = FileSchemaFactory;
