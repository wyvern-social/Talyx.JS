import Localization from "./core/localization.ts";

const localeInstance = new Localization();
localeInstance.loadFile("en-US", "./en-US.talyx")
localeInstance.currentLanguage = "en-US";

var meta = localeInstance.getMetadata()
console.log("=== Metadata ===")
console.log(`Locale: ${meta?.Locale}`)
console.log(`Plural Rules: ${meta?.PluralRules}`)
console.log(`Direction: ${meta?.Direction}`)

console.log()

console.log("=== Example Lookups===")
console.log(`greeting: ${localeInstance.Get("greeting")}`)
console.log(`welcome_message: ${localeInstance.Get("welcome_message", new Map().set("username", "kagaries"))}`)
console.log(`apples (2): ${localeInstance.Get("apples", new Map().set("count", "2"))}`)
//console.log(`status_message: ${localeInstance.Get("status_message", new Map().set("count", "2"))}`)

console.log()

console.log("=== All keys ===")
for (var key of localeInstance.Keys()) {
    console.log(key)
}