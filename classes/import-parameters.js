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

const xmldom = require('xmldom');
const shell = require('shelljs');
const BridgeFactory = require('./bridge-factory');

/**
 * @private
 */
function _getValueOrDefault(val, def) {
  return (val === undefined) ? def : val;
}

/**
 * ImportParameters class -- for encapsulating parameters for creating an import area in IMAM
 * @license Apache-2.0
 */
class ImportParameters {

  constructor(envCtx, bridgeName, bridgeVersion) {
    this._ctx = envCtx;
    this._doc = new xmldom.DOMImplementation().createDocument(null, "ImportParameters", null);
    this._doc.documentElement.setAttribute("bridgeId", BridgeFactory.getBridgeId(bridgeName, bridgeVersion));
    this._doc.documentElement.setAttribute("bridgeVersion", bridgeVersion);
    this._doc.documentElement.setAttribute("release", "11.5.0.1");
    this._doc.documentElement.setAttribute("bridgeDisplayName", bridgeName);
    this._doc.normalize();
  }

  /**
   * Retrieve the ImportParameters document
   * 
   * @function
   */
  getImportParametersDoc() {
    return this._doc;
  }

  /**
   * Add the specified parameter to the import
   *
   * @function
   * @param {string} id
   * @param {string} displayName
   * @param {string} value
   * @param {Node} [location] - the XML location at which to add the parameter
   */
  addParameter(id, displayName, value, location) {
    
    const eP = this._doc.createElement("Parameter");
    eP.setAttribute("displayName", displayName);
    eP.setAttribute("id", id);
    const eV = this._doc.createElement("value");
    let val = null;
    if (id.toUpperCase().indexOf("PASSWORD") !== -1) {
      const encrypted = shell.exec(this._ctx.asbhome + "/bin/encrypt.sh " + _getValueOrDefault(value, ""), {silent: true, "shell": "/bin/bash"});
      val = this._doc.createTextNode(encrypted.stdout.replace("\n", ""));
    } else {
      val = this._doc.createTextNode(_getValueOrDefault(value, ""));
    }
    eV.appendChild(val);
    eP.appendChild(eV);

    if (location === undefined || location === null) {
      const nIP = this._doc.getElementsByTagName("ImportParameters")[0];
      nIP.appendChild(eP);
    } else {
      location.appendChild(eP);
    }

  }

  /**
   * Add the specified data connection parameters to the import
   *
   * @function
   * @param {Object[]} dcnParamsList - an array of objects, each object having an 'id', 'displayName' and 'value'
   */
  addDataConnection(dcnParamsList) {

    const nIP = this._doc.getElementsByTagName("ImportParameters")[0];

    const eCP = this._doc.createElement("CompositeParameter");
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

}

module.exports = ImportParameters;
