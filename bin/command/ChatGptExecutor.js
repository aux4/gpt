const colors = require("colors");
const readline = require("readline");
const { Printer } = require("@aux4/engine");
const Gpt = require("../../lib/Gpt");

const out = Printer.on(process.stdout);

async function chatGptExecute(params) {
  const model = await params.model;
  const history = await params.history;

  const gpt = new Gpt(model);
  await gpt.instructions("instructions.txt");
  await gpt.history(history);

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

    chat(gpt, ref);
  });

  await chat(gpt, ref);
}

async function chat(gpt, ref) {
  out.println("You:".cyan);

  if (ref.multiline) {
    out.println("Multi-line mode enabled. Press Ctrl+S to send the message.".gray);
  } else {
    out.println("Press Ctrl+B to enable multi-line mode".gray);
  }

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

    gpt.message(question);
  });
}

module.exports = { chatGptExecute };
