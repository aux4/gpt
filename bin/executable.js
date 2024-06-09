#!/usr/bin/env node

const { Engine } = require("@aux4/engine");
const { askGptExecute } = require("./command/AskGptExecutor");
const { chatGptExecute } = require("./command/ChatGptExecutor");
const { readGptExecute } = require("./command/ReadGptExecutor");

process.title = "aux4-gpt";

const config = {
  profiles: [
    {
      name: "main",
      commands: [
        {
          name: "ask",
          execute: askGptExecute,
          help: {
            text: "Ask a question to GPT",
            variables: [
              {
                name: "instructions",
                text: "The instructions file of the prompt",
                default: "instructions.txt"
              },
              {
                name: "model",
                text: "The model to use",
                default: "gpt-4o"
              },
              {
                name: "role",
                text: "The role of the user",
                default: "user"
              },
              {
                name: "history",
                text: "The file to use as history",
                default: ""
              },
              {
                name: "outputSchema",
                text: "The file that represents the JSON schema of the output",
                default: "schema.json"
              },
              {
                name: "context",
                text: "Read context from stdin",
                default: false
              },
              {
                name: "question",
                text: "The question to ask",
                default: "",
                arg: true
              }
            ]
          }
        },
        {
          name: "chat",
          execute: chatGptExecute,
          help: {
            text: "Chat with GPT",
            variables: [
              {
                name: "instructions",
                text: "The instructions file of the prompt",
                default: "instructions.txt"
              },
              {
                name: "model",
                text: "The model to use",
                default: "gpt-4o"
              },
              {
                name: "role",
                text: "The role of the user",
                default: "user"
              },
              {
                name: "history",
                text: "The file to use as history",
                default: ""
              },
              {
                name: "outputSchema",
                text: "The file that represents the JSON schema of the output",
                default: "schema.json"
              }
            ]
          }
        },
        {
          name: "read",
          execute: readGptExecute,
          help: {
            text: "Read from stdin with GPT",
            variables: [
              {
                name: "instructions",
                text: "The instructions file of the prompt",
                default: "instructions.txt"
              },
              {
                name: "model",
                text: "The model to use",
                default: "gpt-4o"
              },
              {
                name: "role",
                text: "The role of the user",
                default: "user"
              },
              {
                name: "history",
                text: "The file to use as history",
                default: ""
              },
              {
                name: "outputSchema",
                text: "The file that represents the JSON schema of the output",
                default: "schema.json"
              }
            ]
          }
        }
      ]
    }
  ]
};

(async () => {
  const engine = new Engine({ aux4: config });

  const args = process.argv.splice(2);

  try {
    await engine.run(args);
  } catch (e) {
    console.error(e.message.red, e);
    process.exit(1);
  }
})();
