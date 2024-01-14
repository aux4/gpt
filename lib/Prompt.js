const VARIABLE_REGEX = /\{([a-zA-Z0-9-_]+)\}/g;

async function replacePromptVariables(text, params) {
  const variables = text.match(VARIABLE_REGEX);
  const variableValues = variables
    .map(variable => variable.substring(1, variable.length - 1))
    .reduce((acc, variable) => ({ ...acc, [variable]: undefined }), {});

  for (const variable in variableValues) {
    variableValues[variable] = await params[variable];
  }

  let output = text;
  for (const variable in variableValues) {
    const value = variableValues[variable];
    if (value === undefined) {
      continue;
    }
    output = output.replaceAll(`{${variable}}`, variableValues[variable]);
  }

  return output;
}

module.exports = { replacePromptVariables };
