export default class Metadata {
    Locale: string;
    PluralRules: string;
    Direction: string;

    constructor() {
        this.Locale = "en-US";
        this.PluralRules = "cardinal";
        this.Direction = "ltr";
    }
}