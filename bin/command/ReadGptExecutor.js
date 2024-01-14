const Gpt = require("../../lib/Gpt");
const { Printer } = require("@aux4/engine");
const Input = require("@aux4/input");
const { readFile, asJson } = require("../util/FileUtils");

const out = Printer.on(process.stdout);

async function readGptExecute(params) {
  const instructions = await params.instructions;
  const model = await params.model;
  const role = await params.role;
  const history = await params.history;
  const outputSchema = await params.outputSchema;

  const gpt = new Gpt(model);
  await gpt.instructions(await readFile(instructions), params);
  await gpt.history(history);
  await gpt.outputSchema(await readFile(outputSchema).then(asJson()));

  gpt.onMessage(answer => {
    out.println(answer.content);
  });

  const message = await Input.readAsString();
  await gpt.message(message, params, role);
}

module.exports = { readGptExecute };
