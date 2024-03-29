const Gpt = require("../../lib/Gpt");
const { Printer } = require("@aux4/engine");
const Input = require("@aux4/input");
const { readFile, asJson } = require("../util/FileUtils");

const out = Printer.on(process.stdout);

async function askGptExecute(params) {
  const instructions = await params.instructions;
  const model = await params.model;
  const question = await params.question;
  const role = await params.role;
  const history = await params.history;
  const outputSchema = await params.outputSchema;
  const context = await params.context;

  if (!question) {
    throw new Error("question is required");
  }

  const gpt = new Gpt(model);
  await gpt.instructions(await readFile(instructions), params);
  await gpt.history(history);
  await gpt.outputSchema(await readFile(outputSchema).then(asJson()));

  gpt.onMessage(answer => {
    out.println(answer.content);
  });

  let contextContent;
  if (context === true || context === "true") {
    contextContent = await Input.readAsString();
  }

  let message = question;
  if (contextContent) {
    message = `---\n${contextContent}\n---\n${question}`;
  }

  await gpt.message(message, params, role);
}

module.exports = { askGptExecute };
