import url from 'url';

import jed from 'jed';
import semver from 'semver';
import { oneLine } from 'common-tags';

import { PACKAGE_TYPES, LOCAL_PROTOCOLS } from 'const';

/*
 * Takes an AST node and returns the root property.
 *
 * example: foo().bar.baz() will return the AST node for foo.
 */
export function getRootExpression(node) {
  let root = node.callee;

  // If we encounter a member, grab the parent
  if (node.callee.type === 'MemberExpression') {
    let parent = node.callee.object;
    while (parent.type !== 'Identifier') {
      if (parent.callee.type === 'MemberExpression') {
        parent = parent.callee.object;
      } else {
        parent = parent.callee;
      }
    }
    root = parent;
  }

  return root;
}

/*
 * Returns the name of the reference node passed.
 *
 * example: var foo = document;
 *  The node for foo will return 'document'
 */
export function getNodeReference(context, node) {
  const variables = context.getScope().variables;
  let scopeVar;

  // Just return the value if the node passed in is a reference to a literal.
  if (typeof node === 'undefined' || node.type === 'Literal') {
    return node;
  }

  // Finds variable reference in current scope.
  for (let i = 0; i < variables.length; i++) {
    const variable = variables[i];
    if (variable.name === node.name) {
      scopeVar = variable;
      break;
    }
  }

  if (scopeVar && scopeVar.defs && scopeVar.defs[0] &&
      scopeVar.defs[0].parent && scopeVar.defs[0].parent.parent &&
      scopeVar.defs[0].parent.parent.body) {
    // This represents all occurrences of the variable
    const occurances = scopeVar.defs[0].parent.parent.body;
    let lastAssignment;

    if (occurances instanceof Array) {
      occurances.forEach((occurance) => {
        if (occurance.type === 'VariableDeclaration' &&
            occurance.declarations[0].init !== null) {
          // Get what the name of what it was assigned to or the raw
          // value depending on the initalization
          lastAssignment = occurance.declarations[0].init;
        } else if (occurance.type === 'ExpressionStatement' &&
                   occurance.expression.type === 'AssignmentExpression') {
          // Get the right hand side of the assignment
          lastAssignment = occurance.expression.right;
        }
      });
    }

    // Return the name of the first definition of the variable which
    // corresponds to the node passed in.
    if (lastAssignment) {
      return lastAssignment;
    }
  }

  // If that variable doesn't exist in scope, then just return the node's
  // name.
  return node;
}

/*
 * Get a variable from a eslint context object if it exists, otherwise
 * undefined.
 */
export function getVariable(context, name) {
  const variables = context.getScope().variables;
  let result;
  variables.forEach((variable) => {
    if (variable.name === name && variable.defs && variable.defs[0] &&
      variable.defs[0].name && variable.defs[0].name.parent) {
      result = variable.defs[0].name.parent.init;
    }
  });
  return result;
}

/*
 * Gettext utils. No-op until we have proper
 * a proper l10n solution.
 *
 */
export function gettext(str) {
  return str;
}

/*
 * An sprintf to use with gettext. Imported from Jed for when we have a proper
 * l10n solution.
 */
export const sprintf = jed.sprintf;

/*
 * Check the minimum node version is met
 */
export function checkMinNodeVersion(minVersion, _process = process) {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-param-reassign
    minVersion = minVersion || '0.12.0';
    if (!semver.gte(_process.version, minVersion)) {
      throw new Error(oneLine`Node version must be ${minVersion} or
                      greater. You are using ${_process.version}.`);
    } else {
      resolve();
    }
  });
}


export function getPackageTypeAsString(numericPackageType) {
  const packageKeys = Object.keys(PACKAGE_TYPES);
  for (let i = 0; i < packageKeys.length; i++) {
    const packageType = packageKeys[i];
    if (parseInt(numericPackageType, 10) === PACKAGE_TYPES[packageType]) {
      return packageType;
    }
  }
  throw new Error(`Invalid package type constant "${numericPackageType}"`);
}

/*
 * Looks through all exported functions and returns only
 * "public" *functions* that aren't prefixed with an _
 *
 * Used for ignoring private functions and constants in rules files.
 * Rules can have private functions we don't run; anything that
 * starts with an "_" shouldn't be returned.
 *
 * This exists because we export private functions in rule files
 * for testing.
 */
export function ignorePrivateFunctions(list) {
  const filteredList = {};

  Object.keys(list).forEach((functionName) => {
    if (functionName.startsWith('_') === false &&
        typeof list[functionName] === 'function') {
      filteredList[functionName] = list[functionName];
    }
  });

  return filteredList;
}


/*
 * Check a filename to make sure it's valid; used by scanners so we never
 * accept new scanners that don't specify which file they're referencing.
 */
export function ensureFilenameExists(filename) {
  if (typeof filename !== 'string' || filename.length < 1) {
    throw new Error('Filename is required');
  }
}


export function isLocalUrl(urlInput) {
  const parsedUrl = url.parse(urlInput);
  const protocol = parsedUrl.protocol;
  const path = parsedUrl.path;
  // Check protocol is chrome: or resource: if set.
  // Details on the chrome protocol are here: https://goo.gl/W52T0Q
  // Details on resource protocol are here: https://goo.gl/HHqeJA
  if (protocol && !LOCAL_PROTOCOLS.includes(protocol)) {
    return false;
  }
  // Disallow protocol-free remote urls.
  if (path.startsWith('//')) {
    return false;
  }
  return true;
}

export function apiToMessage(string) {
  return string
    .replace(/^extension/, 'ext')
    .replace(/\./g, '_')
    .toUpperCase()
    .substr(0, 25);
}

export function isBrowserNamespace(string) {
  return ['browser', 'chrome'].includes(string);
}


export function parseCspPolicy(policy) {
  if (!policy) {
    return {};
  }

  // eslint-disable-next-line no-param-reassign
  policy = policy.toLowerCase();

  const parsedPolicy = {};
  const directives = policy.split(';');

  directives.forEach((directive) => {
    // eslint-disable-next-line no-param-reassign
    directive = directive.trim();
    const tokens = directive.split(/\s+/);

    const name = tokens[0];

    if (name) {
      parsedPolicy[name] = tokens.slice(1, tokens.length);
    }
  });

  return parsedPolicy;
}
