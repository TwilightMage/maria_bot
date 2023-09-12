import {GPT4FunctionDef} from "./types";
import * as ai from "../ai";
import {Message} from "discord.js";

export const DrawImage: GPT4FunctionDef = {
    signature: {
        name: 'draw_image',
        description: 'нарисуй картинку',
        parameters: {
            type: 'object',
            properties: {
                idea: {
                    type: 'array',
                    description: 'ключевые слова, описывающие картинку',
                    items: {
                        type: 'string'
                    }
                },
                style: {
                    type: 'string',
                    description: 'стиль в котором нужно нарисовать картинку',
                    enum: ai.ImageStyles
                },
                character: {
                    type: 'boolean',
                    description: 'нужно ли нарисовать персонажа или существо'
                }
            }
        }
    },
    handler: async (message, app, args) => {
        var keywords = args.idea ?? []
        var style = args.style ?? 'anime'
        var drawCharacter = args.character ?? false

        const positiveKeywords = (await ai.translate(keywords.join(', '), 'en')).split(',').map(word => word.trim())
        if (!positiveKeywords.includes('best quality')) positiveKeywords.unshift('best quality')
        if (!positiveKeywords.includes('masterpiece')) positiveKeywords.unshift('masterpiece')

        var negativeKeywords = ['blurry', 'bad', 'cut off', 'deformed', 'bad art', 'beginner', 'draft', 'poorly drawn', 'watermark']
        if (drawCharacter) {
            negativeKeywords.push('poorly drawn hands', 'poorly drawn feet', 'poorly drawn face', 'disfigured', 'bad anatomy')
        }
        negativeKeywords = negativeKeywords.filter(word => !positiveKeywords.includes(word))

        await message.channel.sendTyping()
        var typing_timer = setInterval(async () => {
            await message.channel.sendTyping()
        }, 2000)

        ai.drawImage(positiveKeywords.join(', '), negativeKeywords.join(', '), style).then(async (imageResult) => {
            clearInterval(typing_timer)

            var response: Message | null

            if (imageResult instanceof Buffer) {
                response = await message.reply({content: `Хорошо, вот что у меня вышло.\nКлючевые слова: ${positiveKeywords.map(word => `\`${word}\``).join(', ')}.\nИзбегались следующие особенности: ${negativeKeywords.map(word => `\`${word}\``).join(', ')}.\nСтиль: \`${style}\`.`, files: [imageResult]})
            } else {
                switch (imageResult) {
                    default:
                        response = await message.reply({content: `У меня не получилось, сори.`})
                        break
                }
            }

            if (!!response) {
                app.registerChatEntry(message, [response])
            }
        })
    }
}