const path = require("path");
const fs = require("fs");
const { Command } = require("@aux4/engine");
const { lookpath } = require("lookpath");
const OpenAI = require("openai");
const { readFile, asJson } = require("../bin/util/FileUtils");
const { replacePromptVariables } = require("./Prompt");

class Gpt {
  constructor(model = "gpt-4o") {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = model;
    this.messages = [];
  }

  async instructions(instructions, params) {
    if (!instructions) {
      return;
    }

    const text = await replacePromptVariables(instructions, params);

    this.messages.push({
      role: "system",
      content: text
    });
  }

  async history(file) {
    if (!file || file === "") return;

    this.historyFile = file;
    this.messages = (await readFile(file).then(asJson())) || [];
  }

  async outputSchema(schema) {
    this.outputSchema = schema;
  }

  async message(message, params, role = "user") {
    const text = await replacePromptVariables(message, params);

    this.messages.push({
      role: role,
      content: text
    });

    const answer = await this.call();
    this.messages.push(answer);

    if (this.historyFile) {
      fs.writeFileSync(this.historyFile, JSON.stringify(this.messages.filter(message => message.role !== "system")));
    }

    if (this.callback) {
      this.callback(answer);
    }
  }

  async call() {
    const functions = [
      {
        type: "function",
        function: {
          name: "readFile",
          description: "Reads file from local disk",
          parameters: {
            type: "object",
            properties: { file: { type: "string" } }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "writeFile",
          description: "Writes file to local disk",
          parameters: {
            type: "object",
            properties: { file: { type: "string" }, content: { type: "string" } }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "listFiles",
          description:
            "List files recursively from the provided path. Exclude files by prefix with comma separated values",
          parameters: {
            type: "object",
            properties: { path: { type: "string" }, exclude: { type: "string" }, recursive: { type: "boolean" } }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "createDirectory",
          description:
            "Create directory recursively from the provided path",
          parameters: {
            type: "object",
            properties: { path: { type: "string" } }
          }
        }
      }
    ];

    if (this.outputSchema) {
      functions.push({
        type: "function",
        function: {
          name: "jsonOutput",
          description: "Output JSON object according to the provided schema",
          parameters: {
            type: "object",
            properties: this.outputSchema
          }
        }
      });
    }

    const aux4Commands = await listAux4Commands();
    functions.push(...aux4Commands);

    const functionMap = {
      readFile: readLocalFile,
      writeFile: writeLocalFile,
      listFiles: listFiles,
      createDirectory: createDirectory,
      jsonOutput: options => JSON.stringify(options, null, 2)
    };

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: this.messages,
      tools: functions
    });

    let answer = completion.choices[0].message;
    this.messages.push(answer);

    if (answer.tool_calls) {
      for (const tool of answer.tool_calls) {
        try {
          const method = functionMap[tool.function.name] || execAux4(tool.function.name);
          const result = await method(JSON.parse(tool.function.arguments));

          this.messages.push({
            tool_call_id: tool.id,
            role: "tool",
            name: tool.function.name,
            content: JSON.stringify(result)
          });
        } catch (e) {
          this.messages.push({
            tool_call_id: tool.id,
            role: "tool",
            name: tool.function.name,
            content: `failed to call the function ${tool.function.name} with error ${e.message}`
          });
        }
      }

      answer = await this.call();
    }

    return answer;
  }

  onMessage(callback) {
    this.callback = callback;
  }
}

async function readLocalFile(options) {
  const file = path.resolve(options.file);
  const currentDirectory = process.cwd();

  if (!file.startsWith(currentDirectory)) {
    throw new Error("Access denied");
  }

  if (!fs.existsSync(file)) {
    throw new Error("File not found");
  }

  return fs.readFileSync(file, { encoding: "utf-8" });
}

async function writeLocalFile(options) {
  const file = path.resolve(options.file);
  const currentDirectory = process.cwd();

  if (!file.startsWith(currentDirectory)) {
    throw new Error("Access denied");
  }

  fs.writeFileSync(file, options.content, { encoding: "utf-8" });

  return "file created";
}

async function listFiles(options) {
  const currentDirectory = process.cwd();
  const directory = path.resolve(options.path || currentDirectory);
  const exclude = (options.exclude && options.exclude.split(",")) || [];

  if (!directory.startsWith(currentDirectory)) {
    throw new Error("Access denied");
  }
  const files = fs.readdirSync(directory, {
    recursive: options.recursive !== false && options.recursive !== "false",
    withFileTypes: true
  });

  return files
    .filter(file => file.isFile())
    .map(file => {
      const filePath = file.path.replace(directory, "");
      const fileDirectory = filePath.startsWith(path.sep) ? filePath.substring(1) : filePath;
      return path.join(fileDirectory, file.name);
    })
    .filter(file => !exclude.some(prefix => file.startsWith(prefix)));
}

async function createDirectory(options) {
  const directory = path.resolve(options.path);
  const currentDirectory = process.cwd();

  if (!directory.startsWith(currentDirectory)) {
    throw new Error("Access denied");
  }

  if (fs.existsSync(directory)) {
    return "directory already exists";
  }

  fs.mkdirSync(directory, { recursive: true });

  return "directory created";
}

function execAux4(name) {
  return async function (options) {
    const args = Object.keys(options)
      .map(key => `--${key} '${options[key]}'`)
      .join(" ");
    const { stdout } = await Command.execute(`aux4 ${name} ${args}`);

    return stdout;
  };
}

async function listAux4Commands() {
  const commands = [];

  const aux4Path = await lookpath("aux4");
  if (!aux4Path) {
    return commands;
  }

  try {
    const { stdout } = await Command.execute("aux4 aux4 man --json");
    if (!stdout || stdout === "") {
      return commands;
    }

    const aux4Commands = JSON.parse(stdout);
    aux4Commands.forEach(command => {
      commands.push({
        type: "function",
        function: {
          name: command.name,
          description: command.text,
          parameters: {
            type: "object",
            properties: (
              command.params?.map(param => ({
                [param.name]: { type: "string", description: param.text }
              })) || []
            ).reduce((a, b) => ({ ...a, ...b }), {})
          }
        }
      });
    });
  } catch (e) {}

  return commands;
}

module.exports = Gpt;
