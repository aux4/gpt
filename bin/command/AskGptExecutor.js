const Gpt = require("../../lib/Gpt");
const { Printer } = require("@aux4/engine");

const out = Printer.on(process.stdout);

async function askGptExecute(params) {
  const model = await params.model;
  const question = await params.question;
  const history = await params.history;

  const gpt = new Gpt(model);
  await gpt.instructions("instructions.txt");
  await gpt.history(history);

  gpt.onMessage(answer => {
    out.println(answer.content);
  });

  await gpt.message(question);
}

module.exports = { askGptExecute };
