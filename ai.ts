import config from "./config.json" assert {type: "json"}
import {Configuration, OpenAIApi} from "openai";
import login from "./login.json" assert {type: "json"};
import fs from "fs";
import * as utils from "./utils";
import axios from "axios";
import {CreateChatCompletionRequest} from "openai/api";
import {language} from "./localize";

const configuration = new Configuration({
    apiKey: login.ai_key,
});
const openai = new OpenAIApi(configuration);

function readPreset(name: string) {
    return JSON.parse(fs.readFileSync(`./${name}.json`).toString());
}

export async function conversation(context: string, history: {user: string, ai: string}[], new_message: string, lang: language, uid: string) {
    let preset = readPreset('ai_preset_chat') as CreateChatCompletionRequest
    preset.messages = [{role: 'system', content: fs.readFileSync(fs.existsSync(`chat_system_${lang}.txt`) ? `chat_system_${lang}.txt` : 'chat_system_en.txt').toString() + '\n' + context}]
    preset.user = uid

    for (let message of history) {
        preset.messages.push({role: 'user', content: message.user})
        preset.messages.push({role: 'assistant', content: message.ai})
    }

    preset.messages.push({role: 'user', content: new_message})

    try {
        const response = await openai.createChatCompletion(preset)
        return response.data.choices[0].message?.content
    } catch (e: any) {
        return e.response.status as number
    }
}

export async function idea() {
    let preset = readPreset('ai_preset_idea')
    let mood = utils.oneOf(['', 'cute', 'stupid', 'funny', 'sad'])
    let subject = utils.oneOf(['animals', 'fantasy animals', 'dragons'])
    preset.prompt = `Give me an idea for a ${mood} picture of ${subject}.\n\n`
    try {
        const response = await openai.createCompletion(preset)
        let idea = response.data.choices[0].text?.trim() || ''
        idea = idea.replace(/^[\t\s\r\n,.!?]+|[\t\s\r\n,.!?]+$/g, '')
        return idea
    } catch (e: any) {
        return e.response.status as number
    }
}

export async function fetchBio(bio_src: string) {
    let bio_3
    let bio_2
    let name
    let is_female

    const method = config.bio_method as 'gpt_3_completion' | 'gpt_4_chat'

    switch (method) {
        case 'gpt_3_completion':
        {
            let preset = readPreset('ai_preset_rephrase_bio')

            preset.prompt = `Convert this from first-person to third person: ${bio_src}\n\n`
            bio_3 = (await openai.createCompletion(preset)).data.choices[0].text?.trim() || ''

            preset.prompt = `Convert this from first-person to second person: ${bio_src}\n\n`
            bio_2 = (await openai.createCompletion(preset)).data.choices[0].text?.trim() || ''

            preset.prompt = `What is the name of this person: ${bio_src}\n\n`
            name = (await openai.createCompletion(preset)).data.choices[0].text?.trim() || ''
            //name = name.replaceAll(/^[\t\s\r\n,.]+|[\t\s\r\n,.]+$/g, '')

            preset.max_tokens = 2
            preset.prompt = `Is this person a female: ${bio_src}\n\n`
            const is_female_str = (await openai.createCompletion(preset)).data.choices[0].text?.trim().toLowerCase()
            is_female = is_female_str === 'yes'
        }
            break
        case 'gpt_4_chat':
        {
            let chat_preset = readPreset('ai_preset_chat') as CreateChatCompletionRequest
            let davinci_preset = readPreset('ai_preset_rephrase_bio')

            chat_preset.messages = [{role: 'user', content: `Convert this from first-person to third person: ${bio_src}`}]
            bio_3 = (await openai.createChatCompletion(chat_preset)).data.choices[0].message?.content || ''

            chat_preset.messages = [{role: 'user', content: `Convert this from first-person to second person: ${bio_src}`}]
            bio_2 = (await openai.createChatCompletion(chat_preset)).data.choices[0].message?.content || ''

            //chat_preset.messages = [{role: 'user', content: `What is the name of this person: ${bio_src}`}]
            //const name = (await openai.createChatCompletion(chat_preset)).data.choices[0].message?.content || ''
            davinci_preset.prompt = `What is the name of this person: ${bio_src}\n\n`
            name = (await openai.createCompletion(davinci_preset)).data.choices[0].text?.trim() || ''

            is_female = true
        }
            break
    }

    return {
        bio_3: bio_3,
        bio_2: bio_2,
        name: name,
        is_female: is_female
    }
}

export async function image(query: string) {
    try {
        return {
            status: 200,
            url: (await openai.createImage({
                prompt: query,
                n: 1,
                size: "512x512",
            })).data.data[0].url
        }
    } catch (e: any) {
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
