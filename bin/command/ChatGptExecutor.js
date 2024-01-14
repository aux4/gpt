const colors = require("colors");
const readline = require("readline");
const { Printer } = require("@aux4/engine");
const Gpt = require("../../lib/Gpt");
const { readFile, asJson } = require("../util/FileUtils");

const out = Printer.on(process.stdout);

async function chatGptExecute(params) {
  const instructions = await params.instructions;
  const model = await params.model;
  const role = await params.role;
  const history = await params.history;
  const outputSchema = await params.outputSchema;

  const gpt = new Gpt(model);
  await gpt.instructions(await readFile(instructions), params);
  await gpt.history(history);
  await gpt.outputSchema(await readFile(outputSchema).then(asJson()));

  const ref = {
    multiline: false
  };

  process.stdin.on("keypress", (ch, key) => {
    if (key && key.ctrl && key.name === "c") {
      ref.rl.close();
      process.exit(0);
    } else if (key && key.ctrl && key.name === "b") {
      ref.multiline = !ref.multiline;
      if (ref.multiline) {
        out.println("Multi-line mode enabled. Press Ctrl+S to send the message.".gray);
      } else {
        out.println("Multi-line mode disabled.".gray);
      }
    } else if (key && key.ctrl && key.name === "s") {
      ref.rl.close();
    } else if (key && key.name === "return" && !ref.multiline) {
    }
  });

  gpt.onMessage(answer => {
    out.println("Assistent:".yellow);
    out.println(answer.content.trim());

    chat(gpt, ref, params, role);
  });

  await chat(gpt, ref, params, role);
}

async function chat(gpt, ref, params, role) {
  if (ref.multiline) {
    out.println("Multi-line mode enabled. Press Ctrl+S to send the message.".gray);
  } else {
    out.println("Press Ctrl+B to enable multi-line mode".gray);
  }

  out.println("You:".cyan);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  ref.rl = rl;
  let text = "";

  rl.on("line", line => {
    text += line + "\n";

    if (!ref.multiline) {
      rl.close();
    }
  });

  rl.on("close", () => {
    const question = text.trim();
    if (question.length === 0 || question.trim() === "exit" || question.trim() === "quit") {
      process.exit(0);
    }

    gpt.message(question, params, role);
  });
}

module.exports = { chatGptExecute };
