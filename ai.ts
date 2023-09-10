import config from "./config.json" assert {type: "json"}
import {Configuration, OpenAIApi} from "openai";
import login from "./login.json" assert {type: "json"};
import fs from "fs";
import * as utils from "./utils";
import axios, {AxiosError} from "axios";
import {ChatCompletionFunctions, CreateChatCompletionRequest} from "openai/api";
import {language} from "./localize";
import {v2} from "@google-cloud/translate";

const translator = new v2.Translate({key: login.google_key})

const configuration = new Configuration({
    apiKey: login.ai_key,
});
const openai = new OpenAIApi(configuration);

function readPreset(name: string) {
    return JSON.parse(fs.readFileSync(`./${name}.json`).toString());
}

declare interface GptFunction {
    name: string
    arguments: any
}

export const ImageStyles = ['enhance' , 'anime' , 'photographic' , 'digital-art' , 'comic-book' , 'fantasy-art' , 'line-art' , 'analog-film' , 'neon-punk' , 'isometric' , 'low-poly' , 'origami' , 'modeling-compound' , 'cinematic' , '3d-model' , 'pixel-art' , 'tile-texture'] as const
export declare type ImageStyleType = typeof ImageStyles[number]

export async function conversation(context: string, history: {user: string, ai: string}[], new_message: string, lang: language, uid: string, functions?: ChatCompletionFunctions[]) {
    let preset = readPreset('ai_preset_chat') as CreateChatCompletionRequest
    preset.messages = [{role: 'system', content: fs.readFileSync(fs.existsSync(`chat_system_${lang}.txt`) ? `chat_system_${lang}.txt` : 'chat_system_en.txt').toString() + '\n' + context}]
    preset.user = uid
    preset.functions = functions

    for (let message of history) {
        preset.messages.push({role: 'user', content: message.user})
        preset.messages.push({role: 'assistant', content: message.ai})
    }

    preset.messages.push({role: 'user', content: new_message})

    try {
        const response = await openai.createChatCompletion(preset)
        const response_message = response.data.choices[0].message
        if (!!response_message?.function_call) {
            return {
                name: response_message.function_call.name,
                arguments: JSON.parse(response_message.function_call.arguments ?? "{}")
            } as GptFunction
        } else {
            return response_message?.content
        }
    } catch (e: any) {
        console.error(`Got error on request: ${e.response.status as number} - ${e.response.statusText}, ${e.response.data}`)
        return e.response.status as number
    }
}

export async function generateIdea() {
    let preset = readPreset('ai_preset_idea')
    let mood = utils.oneOf(['', 'cute', 'stupid', 'funny', 'sad'])
    let subject = utils.oneOf(['animals', 'fantasy animals', 'dragons'])
    preset.prompt = `Give me an idea for ${mood} picture of ${subject}.\n\n`
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

export async function drawImage(positivePrompt: string, negativePrompt: string, preset: ImageStyleType) : Promise<number | Buffer> {
    try {
        const response = await axios.post(
            'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
            {
                steps: 40,
                width: 1024,
                height: 1024,
                seed: 0,
                cfg_scale: 5,
                samples: 1,
                style_preset: preset,
                text_prompts: [
                    {
                        'text': positivePrompt,
                        'weight': 1
                    },
                    {
                        'text': negativePrompt,
                        'weight': -1
                    }
                ],
            },
            {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${login.stability_key}`
                }
            })

        return Buffer.from(response.data.artifacts[0].base64, 'base64')
    } catch (e: any) {
        console.error(`Failed to generate image with prompt "${positivePrompt}" and preset "${preset}"`)
        if (e instanceof AxiosError) {
            console.error(e.response!.data)
            return e.status!
        } else {
            console.error(e)
            return 400
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
    //let request = await axios.get(`https://api.openai.com/dashboard/billing/subscription`, {headers: {authorization: `Bearer ${login.ai_key}`}})
    //return request.data.hard_limit_usd
    return 20
}

export async function detectLanguage(text: string) {
    return await translator.detect(text)
}

export async function translate(text: string, to: string) {
    let translation = await translator.translate(text, to)
    return translation[0]
}