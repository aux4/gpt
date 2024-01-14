const fsPromises = require("fs").promises;

async function readFile(file) {
  if (!file) {
    return undefined;
  }

  const exists = await fsPromises.access(file).then(() => true).catch(() => false);
  if (!exists) {
    return undefined;
  }

  return await fsPromises.readFile(file, { encoding: "utf8" });
}

function asJson() {
  return content => {
    if (!content) {
      return undefined;
    }

    try {
      return JSON.parse(content);
    } catch (e) {
      return undefined;
    }
  }
}

module.exports = { readFile, asJson };
