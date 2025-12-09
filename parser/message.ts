export default class Message {
  RawValue: string;
  IsChoice: boolean;
  Choices: Map<string, string>;
  IsPlural: boolean;
  InheritsFrom: string | null;
  HasConditional: boolean;
  constructor(
    raw: string | null,
    isChoice: boolean,
    choices: Map<string, string> | null,
    isPlural: boolean,
    inheritsFrom: string | null,
    hasConditional: boolean
  ) {
    this.RawValue = raw === null ? "" : raw;
    this.IsChoice = isChoice;
    this.Choices = choices === null ? new Map<string, string>() : choices;
    this.IsPlural = isPlural;
    this.InheritsFrom = inheritsFrom;
    this.HasConditional = hasConditional;
  }
}
