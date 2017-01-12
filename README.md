# README

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

## ibm-imam-cli

Re-usable functions for interacting with Metadata Asset Manager via the command-line

**Meta**

-   **license**: Apache-2.0

## createOrUpdateImportArea

Create or update an import area -- necessary before any tasks can be executed

**Parameters**

-   `envCtx` **EnvironmentContext** an environment context from ibm-iis-commons
-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the import area
-   `description` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** description of the import area
-   `bridgeName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the bridge to use for the import area
-   `dcnParams` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>** array of data connection parameters (each object having an 'id', 'displayName', and 'value')
-   `bridgeParams` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>** array of bridge-specific parameters (each object having an 'id', 'displayName', and 'value')

## getImportAreaList

Get a list of import areas and their various last update dates

**Parameters**

-   `envCtx` **EnvironmentContext** an environment context from ibm-iis-commons

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** an object with import area names as keys, and then within each of these a sub-object of timestamps 'importTS', 'analysisTS', 'previewTS', 'shareTS'

## getTemplateForBridge

Returns a template (list of headers) for the bridge specified

**Parameters**

-   `bridgeName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `wb` **Workbook?** an optional workbook into which to add this template

Returns **any** Workbook an Excel Workbook with the template

## buildParameterXML

Builds the parameter XML needed by imam.sh

**Parameters**

-   `envCtx` **EnvironmentContext** an environment context from ibm-iis-commons
-   `filename` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the XML file to produce
-   `bridgeName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the bridge for which the XML file needs to be created
-   `dcnParamList` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>** array of objects describing the data connection, each with 'id', 'displayName' and 'value' properties
-   `paramList` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>** array of objects describing bridge-specific options, each with 'id', 'displayName', and 'value' properties

## loadMetadata

Loads metadata from all of the sources listed in the specified Excel file -- which should have been produced first by the getTemplateForBridge function

**Parameters**

-   `envCtx` **EnvironmentContext** an environment context from ibm-iis-commons
-   `filename` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the .xlsx file containing host details, credentials, etc
-   `callback` **[processCallback](#processcallback)** callback that handles the response of processing

## getColumnDefinitionsFromDDL

Given DDL for defining one or more database tables, converts these into their corresponding IMAM-recognisable data formats

**Parameters**

-   `ddlFile` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** path to the DDL file containing one or more CREATE TABLE statements

Returns **any** FieldDefinitions with table names as keys, each being a sub-object with a 'header' (String) and 'columns' (String\[]) properties

## getHeaderLineForTable

Retrieves the header line for a given table name, from a set of converted field definitions

**Parameters**

-   `tablesToFields` **FieldDefinitions** the set of converted field definitions from getColumnDefinitionsFromDDL
-   `tblName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the table for which to get the header line
-   `delimiter` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** an optional delimiter to use (by default a |)

Returns **any** String with the header line for a data file that will be IMAM-importable

## getOSHSchemaForTable

Creates the contents for an OSH schema file for a given table name, from a set of converted field definitions

**Parameters**

-   `tablesToFields` **FieldDefinitions** the set of converted field definitions from getColumnDefinitionsFromDDL
-   `tblName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the table for which to create the OSH schema file
-   `delimiter` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** an optional delimiter to use (by default a |)
-   `bHeader` **[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** true if there is a header in the data file, false otherwise
-   `escape` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** the string that should be treated as an escape sequence for the delimiter (e.g. a double-quote)

Returns **any** String with the contents for an OSH schema file that will be IMAM-importable

## processCallback

This callback is invoked as the result of processing an Excel file.

Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)

**Parameters**

-   `result` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** the result object, as returned by module:shelljs~exec
-   `bridgeName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the metadata bridge used for the load
-   `dcnParams` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>** array of data connection parameter objects that were used to load metadata, each with an 'id', 'displayName' and 'value'
-   `bridgeParams` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>** array of bridge-specific parameter objects that were used to load metadata, each with an 'id', 'displayName' and 'value'

## BridgeFactory

BridgeFactory class -- for encapsulating information about metadata bridges and creating them when requested

### getImplementedBridges

Retrieves a list of the bridges that can currently be handled by this module

Returns **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)>** a list of the bridge names that are currently implemented in the module

## FileSchemaFactory

FileSchemaFactory class -- for encapsulating information about creating a schema heading for files

## ImportParameters

ImportParameters class -- for encapsulating parameters for creating an import area in IMAM

### getImportParametersDoc

Retrieve the ImportParameters document

### addParameter

Add the specified parameter to the import

**Parameters**

-   `id` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `displayName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `value` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `location` **[Node](https://developer.mozilla.org/en-US/docs/Web/API/Node/nextSibling)?** the XML location at which to add the parameter

### addDataConnection

Add the specified data connection parameters to the import

**Parameters**

-   `dcnParamsList` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>** an array of objects, each object having an 'id', 'displayName' and 'value'
