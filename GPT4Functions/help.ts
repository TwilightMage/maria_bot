import {GPT4FunctionDef} from "./types";

export const Help: GPT4FunctionDef = {
    signature: {
        name: 'help',
        description: 'узнать что я могу',
        parameters: {
            type: 'object',
            properties: {}
        }
    },
    handler: async (message, app, args) => {
        var response = await message.reply({content: "Я могу рисовать картинки, переводить текст и просто разговаривать с тобой."})

        app.registerChatEntry(message, [response])
    }
}