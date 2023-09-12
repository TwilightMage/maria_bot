import {GPT4FunctionDef} from "./types";
import * as ai from "../ai";

export const Translate: GPT4FunctionDef = {
    signature: {
        name: 'translate',
        description: 'перевести текст на указанный язык',
        parameters: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'текст который нужно перевести'
                },
                language: {
                    type: 'string',
                    description: 'код языка на который нужно перевести'
                }
            },
            required: ['text', 'language']
        }
    },
    handler: async (message, app, args) => {
        var text = args.text ?? ''
        var language = args.language ?? ''

        var response = await message.reply({content: await ai.translate(text, language)})

        app.registerChatEntry(message, [response])
    }
}