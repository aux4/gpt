const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

class Gpt {
  constructor(model = "gpt-3.5-turbo") {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = model;
    this.messages = [];
  }

  async instructions(file) {
    if (!file || file === "") return;

    if (!fs.existsSync(file)) {
      return;
    }

    const content = fs.readFileSync(file, { encoding: "utf-8" });

    this.messages.push({
      role: "system",
      content: content
    });
  }

  async history(file) {
    if (!file || file === "") return;

    this.historyFile = file;

    if (!fs.existsSync(file)) {
      return;
    }

    const content = fs.readFileSync(file, { encoding: "utf-8" });
    let messages;

    try {
      messages = JSON.parse(content);
    } catch (e) {
      return;
    }

    this.messages = this.messages.concat(messages);
  }

  async message(message) {
    this.messages.push({
      role: "user",
      content: message
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
      }
    ];

    const functionMap = {
      readFile: readLocalFile,
      writeFile: writeLocalFile
    };

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: this.messages,
      tools: functions
    });

    let answer = completion.choices[0].message;

    if (answer.tool_calls) {
      for (const tool of answer.tool_calls) {
        this.messages.push(answer);

        try {
          const result = await functionMap[tool.function.name](JSON.parse(tool.function.arguments));
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

  if (fs.existsSync(file)) {
    throw new Error("File already exists");
  }

  fs.writeFileSync(file, options.content, { encoding: "utf-8" });

  return "file created";
}

module.exports = Gpt;
