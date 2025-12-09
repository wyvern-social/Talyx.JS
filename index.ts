import Localization from "./core/localization.ts";

const localeInstance = new Localization();

localeInstance.loadFile("en-US", "./en-US.talyx")

localeInstance.currentLanguage = "en-US";

console.log(localeInstance.Get("apples", new Map().set("count", "2")));