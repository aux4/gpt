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

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: this.messages
    });

    const answer = completion.choices[0].message;
    this.messages.push(answer);

    if (this.historyFile) {
      fs.writeFileSync(this.historyFile, JSON.stringify(this.messages.filter(message => message.role !== "system")));
    }

    if (this.callback) {
      this.callback(answer);
    }
  }

  onMessage(callback) {
    this.callback = callback;
  }
}

module.exports = Gpt;
