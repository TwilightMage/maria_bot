import {v2} from "@google-cloud/translate";
import login from "./login.json" assert { type: "json" };

const translator = new v2.Translate({key: login.google_key})

let languages = undefined

export async function detect(text) {
    let language = await translator.detect(text)

}

export async function translate(text, to) {
    let translation = await translator.translate(text, to)
    return translation[0]
}