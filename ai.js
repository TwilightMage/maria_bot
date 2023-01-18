import {Configuration, OpenAIApi} from "openai";
import login from "./login.json" assert {type: "json"};
import fs from "fs";
import * as utils from "./utils.js";
import axios from "axios";

const configuration = new Configuration({
    apiKey: login.ai_key,
});
const openai = new OpenAIApi(configuration);

function readPreset(name) {
    return JSON.parse(fs.readFileSync(`./${name}.json`));
}

export async function conversation(prompt) {
    let preset = readPreset('ai_preset_chat')
    preset.prompt = prompt
    return (await openai.createCompletion(preset)).data.choices[0].text.trim();
}

export async function idea() {
    let preset = readPreset('ai_preset_idea')
    let mood = utils.oneOf(['', 'cute', 'stupid', 'funny', 'sad'])
    let subject = utils.oneOf(['animals', 'fantasy animals', 'dragons'])
    preset.prompt = `Give me an idea for a ${mood} picture of ${subject}.\n\n`
    let idea = (await openai.createCompletion(preset)).data.choices[0].text.trim()
    idea = idea.replaceAll(/^[\t\s\r\n,.!?]+|[\t\s\r\n,.!?]+$/g, '')
    return idea
}

export async function fetchBio(bio_src) {
    let preset = readPreset('ai_preset_rephrase_bio')

    preset.prompt = `Convert this from first-person to third person: ${bio_src}\n\n`
    let bio = (await openai.createCompletion(preset)).data.choices[0].text.trim();

    preset.prompt = `What is the name of narrator of following text: ${bio_src}\n\n`
    let name = (await openai.createCompletion(preset)).data.choices[0].text.trim();
    //name = name.replaceAll(/^[\t\s\r\n,.]+|[\t\s\r\n,.]+$/g, '')

    preset.max_tokens = 1
    preset.prompt = `Is narrator of following text a female: ${bio_src}\n\n`
    let is_female = (await openai.createCompletion(preset)).data.choices[0].text.trim().toLowerCase() === 'yes';

    return {
        bio: bio,
        name: name,
        is_female: is_female
    }
}

export async function image(query) {
    try {
        return {
            status: 200,
            url: (await openai.createImage({
                prompt: query,
                n: 1,
                size: "512x512",
            })).data.data[0].url
        }
    } catch (e) {
        return {
            status: e.response.status
        }
    }
}

export async function getUsage() {
    let now = new Date()
    let cur_month = new Date(now.getFullYear(), now.getMonth(), 1)
    let next_month = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    let request = await axios.get(`https://api.openai.com/dashboard/billing/usage?start_date=${cur_month.getFullYear()}-${cur_month.getMonth() + 1}-${cur_month.getDate()}&end_date=${next_month.getFullYear()}-${next_month.getMonth() + 1}-${next_month.getDate()}`, {headers: {authorization: `Bearer ${login.ai_key}`}})
    return request.data.total_usage
}

export async function getLimit() {
    let request = await axios.get(`https://api.openai.com/dashboard/billing/subscription`, {headers: {authorization: `Bearer ${login.ai_key}`}})
    return request.data.hard_limit_usd
}
