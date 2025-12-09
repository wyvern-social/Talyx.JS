import { log, warn } from "console";
import Parser from "/Users/archervanhorn/talyxjs/parser/parser.ts";
import Metadata from "/Users/archervanhorn/talyxjs/parser/metadata.ts";
import Message from "/Users/archervanhorn/talyxjs/parser/message.ts";

export default class Localization {
  constructor() {}
  languages = new Map<string, Map<string, Message>>();
  currentLanguage = "en-US";

  _metadata = new Map<string, Metadata>();

  loadFile(language: string, path: string) {
    var parser = new Parser();
    var messages = parser.parseFile(path);

    if (!this.languages.has(language))
      this.languages.set(language, new Map<string, Message>());

    this._metadata.set(language, parser.metadata);

    for (const kv of messages) this.languages.get(language)?.set(kv[0], kv[1]);
  }

  Get(key: string, variables: Map<string, object> | null = null) {
    if (!this.languages.get(this.currentLanguage)?.has(key)) return `!${key}!`;
    const dist = this.languages.get(this.currentLanguage);

    if (dist === undefined) {
      warn("This shouldn't happen.");
      return `!${key}!`;
    }

    if (!dist?.has(key)) return `!${key}!`;

    const message = dist.get(key);

    if (message === undefined) {
      warn("This shouldn't happen.");
      return `!${key}!`;
    }

    var value: string | undefined = message.RawValue;

    if (message.InheritsFrom != null) {
      var parentValue = this.Get(message.InheritsFrom, variables);
      value = value.replace("{parent}", parentValue!);
    }

    if (message.IsPlural && variables != null && variables.has("count")) {
      var countVar = variables.get("count");

      if (countVar === undefined) {
        warn("Message is plural but count wasn't found.");
        return `!${key}!`;
      }

      if (typeof countVar != "string") {
        warn("Count variable isn't of type string");
        return `!${key}!`;
      }

      var count = parseInt(countVar);

      value =
        count == 1 && message.Choices.has("one")
          ? message.Choices.get("one")
          : message.Choices.get("other") ?? "";
    }

    if (message.IsChoice && variables != null && variables.has("count")) {
      var countVar = variables.get("count");

      if (countVar === undefined) {
        warn("Message is plural but count wasn't found.");
        return `!${key}!`;
      }

      if (typeof countVar != "string") {
        warn("Count variable isn't of type string");
        return `!${key}!`;
      }

      var count = parseInt(countVar);

      value =
        count == 1 && message.Choices.has("one")
          ? message.Choices.get("one")
          : message.Choices.get("other") ?? "";
    }

    if (message.HasConditional && variables != null) {
      value = this.#evaluateConditionals(value, variables);
    }

    if (variables != null) {
      for (const kv of variables) {
        if (typeof kv[1] != "string") {
          warn(`Value of variable ${kv[0]} was not a string.`);
          return `!${key}!`;
        }

        value = value?.replaceAll("{" + kv[0] + "}", kv[1]);
      }
    }

    if (value?.startsWith("[") && value.endsWith("]")) {
      value = value.substring(1, value.length - 2);
    }

    if (value?.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 2);
    }

    return value;
  }

  #evaluateConditionals(
    value: string | undefined,
    variables: Map<string, object>
  ) {
    if (value === undefined) {
      warn("Attempted to eval conditionals for an undefined value.");
      return;
    }
    const ternaryPattern =
      /\{(\w+)\s*==\s*(\d+)\s*\?\s*([^ ]+)\s*:\s*([^ ]+)\}/g;

    return value.replace(
      ternaryPattern,
      (match, varName, compareValueStr, trueValue, falseValue) => {
        const compareValue = parseInt(compareValueStr, 10);

        if (variables.has(varName)) {
          let varValue = variables.get(varName);

          const intValue = Number(varValue);

          return intValue === compareValue ? trueValue : falseValue;
        }

        return match;
      }
    );
  }

  getMetadata(language: string | null = null) {
    language ??= this.currentLanguage;
    return this._metadata.get(language);
  }

  *Keys(language: string | null = null) {
    language ??= this.currentLanguage;

    const dict = this.languages.get(language);

    if (!dict) {
      return;
    }

    for (const key in dict) {
      if (Object.hasOwnProperty.call(dict, key)) {
        yield key;
      }
    }
  }

  loadedLanguages() {
    return this.languages.keys();
  }

  isLanguageLoaded(langauge: string) {
    return this.languages.has(langauge);
  }
}