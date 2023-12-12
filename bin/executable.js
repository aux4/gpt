#!/usr/bin/env node

const { Engine } = require("@aux4/engine");
const { askGptExecute } = require("./command/AskGptExecutor");
const { chatGptExecute } = require("./command/ChatGptExecutor");

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
                name: "model",
                text: "The model to use",
                default: "gpt-3.5-turbo"
              },
              {
                name: "history",
                text: "The file to use as history",
                default: ""
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
                name: "model",
                text: "The model to use",
                default: "gpt-3.5-turbo"
              },
              {
                name: "history",
                text: "The file to use as history",
                default: ""
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
    console.error(e.message.red);
    process.exit(1);
  }
})();
