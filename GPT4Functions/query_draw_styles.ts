import {GPT4FunctionDef} from "./types";
import {ImageStyles} from "../ai";

export const QueryDrawStyles: GPT4FunctionDef = {
    signature: {
        name: 'query_draw_styles',
        description: 'узнать в каких стилях можно нарисовать картинку',
        parameters: {
            type: 'object',
            properties: {}
        }
    },
    handler: async (message, app, args) => {
        var response = await message.reply({content: `Я могу рисовать картинки в этих стилях: ${ImageStyles.map(word => `\`${word}\``).join(', ')}, но ты можешь упоминать их на любом языке.`})

        app.registerChatEntry(message, [response])
    }
}