import fs from "fs";
import Metadata from "./metadata.ts";
import Message from "./message.ts";
import { log, warn } from "console";

export default class Parser {
  metadata: Metadata;
  constructor() {
    this.metadata = new Metadata();
  }

  parseFile(path: string): Map<string, Message> {
    var result = new Map();
    let content: string;

    try {
        content = fs.readFileSync(path, "utf-8")
    } catch {
        warn("Failed to read file from path.")
        return new Map().set("error", new Message("error", false, null, false, null, false))
    }
    
    const lines: string[] = content.split(/\r?\n/);

    var currentNamespace: string | undefined;
    var currentKey: string | undefined;

    var inMetaBlock: boolean = false;
    var inPluralBlock: boolean = false;
    var inChoiceBlock: boolean = false;
    var inArrayBlock: boolean = false;

    var blockLines: string[] = [];

    for (const rawLine of lines) {
      const line: string = rawLine.trim();

      if (line.startsWith("#") || line.length === 0 || line === null) {
        continue;
      }

      if (line.startsWith("@meta")) {
        inMetaBlock = true;
        if (line.includes("{") && line.includes("}")) {
          this.parseMetaBlock(line);
          inMetaBlock = false;
          continue;
        }
        continue;
      }

      if (inMetaBlock) {
        this.parseMetaBlock(line);
        if (line.includes("}")) {
          inMetaBlock = false;
          continue;
        }
        continue;
      }

      if (line.startsWith("[") && line.endsWith("]")) {
        var ns = line.slice(1, -1).trim();
        if (ns.length === 0 || ns === null) {
          currentNamespace = undefined;
        } else {
          currentNamespace = ns;
        }
        continue;
      }

      if (inPluralBlock || inChoiceBlock || inArrayBlock) {
        blockLines.push(line);
        if (
          (inPluralBlock && line.startsWith("}")) ||
          (inChoiceBlock && line.startsWith("}")) ||
          (inArrayBlock && line.startsWith("]"))
        ) {
          const fullKey = this.buildFullKey(currentNamespace, currentKey!);
          if (inPluralBlock) {
            var msg = new Message(null, false, null, true, null, false);

            for (const l of blockLines) {
              if (l.startsWith("}") || l.startsWith("plural")) continue;

              const regex = /^(\w+):\s*""([^""]+)""$/;
              const m = regex.exec(l.trim());

              if (m !== null) {
                msg.Choices.set(m[1], m[2]);
              }
            }

            result.set(fullKey, msg);
            inPluralBlock = false;
          } else if (inChoiceBlock) {
            var msg = new Message(null, true, null, false, null, false);

            for (const l of blockLines) {
              const regex = /^(\w+):\s*""([^""]+)""$/;
              const m = regex.exec(l.trim());

              if (m !== null)
                msg.Choices.set(m[1].trim(), this.stripQuotes(m[2].trim()));
              else if (l.trim().startsWith("*[other]"))
                msg.Choices.set(
                  "other",
                  this.stripQuotes(l.trim().substring("*[other]".length)).trim()
                );
            }

            result.set(fullKey, msg);
            inChoiceBlock = false;
          } else if (inArrayBlock) {
            result.set(
              fullKey,
              new Message(blockLines.join(" "), false, null, false, null, false)
            );
            inArrayBlock = false;
          }
          blockLines = [];
        }
        continue;
      }

      const match = /^(.+?)\s*=\s*(.+)$/.exec(line);

      if (match !== null) {
        var currentKey: string | undefined = match[1].trim();
        var value = match[2].trim();

        var inheritMatch = /^(.+?)\s*:\s*(.+)$/.exec(currentKey);
        var parentKey: string | null = null;

        if (inheritMatch !== null) {
          currentKey = inheritMatch[1].trim();
          parentKey = inheritMatch[2].trim();
        }

        const fullKey = this.buildFullKey(currentNamespace, currentKey);

        if (value.startsWith("plural")) {
          inPluralBlock = true;
          blockLines = [];
          blockLines.push(value);
          if (line.includes("}")) {
            const msg = new Message(null, false, null, true, null, false);

            for (let rawLine of blockLines) {
              if (rawLine.startsWith("}") || rawLine.startsWith("plural")) {
                continue;
              }

              const m = /^(\w+):\s*""([^""]+)""$/.exec(rawLine.trim());

              if (m !== null) msg.Choices.set(m[1], m[2]);
            }

            result.set(fullKey, msg);
            inPluralBlock = false;
            blockLines = [];
          }
          continue;
        }

        if (value.startsWith("->") || value.endsWith("->")) {
          inChoiceBlock = true;
          blockLines = [];
          blockLines.push(value);

          if (value.includes("{")) {
            const msg = new Message(null, true, null, false, null, false);

            for (const rawLine of blockLines) {
              const m = /^\[([^\]]+)\]\s*(.+)$/.exec(rawLine.trim());

              if (m !== null)
                msg.Choices.set(m[0].trim(), this.stripQuotes(m[1].trim()));
              else if (rawLine.trim().startsWith("*[other]"))
                msg.Choices.set(
                  "other",
                  this.stripQuotes(
                    rawLine.trim().substring("*[other]".length).trim()
                  )
                );
            }

            result.set(fullKey, msg);
            inChoiceBlock = false;
            blockLines = [];
          }
          continue;
        }

        if (value.startsWith("[")) {
          inArrayBlock = false;
          blockLines = [];
          blockLines.push(value);

          if (value.endsWith("]")) {
            result.set(
              fullKey,
              new Message(blockLines.join(" "), false, null, false, null, false)
            );

            inArrayBlock = false;
            blockLines = [];
          }
          continue;
        }

        result.set(
          fullKey,
          new Message(
            this.stripQuotes(value),
            false,
            null,
            false,
            parentKey,
            value.includes("?")
          )
        );
      }
    }

    return result;
  }

  parseMetaBlock(line: string) {
    const regex = /(\w+)\s*=\s*"([^"]+)"/g;
    const matches = line.matchAll(regex);

    for (const match of matches) {
      const key = match[1];
      const value = match[2];

      switch (key) {
        case "locale":
          this.metadata.Locale = value;
          break;
        case "plural_rules":
          this.metadata.PluralRules = value;
          break;
        case "direction":
          this.metadata.Direction = value;
          break;
      }
    }
  }

  stripQuotes(value: string): string {
    if (value.startsWith('"') && value.endsWith('"'))
      return value.substring(1, value.length - 1);
    return value;
  }

  buildFullKey(ns: string | undefined, key: string): string {
    if (ns === undefined || ns.length === 0) {
      return key;
    } else {
      return `${ns}.${key}`;
    }
  }
}