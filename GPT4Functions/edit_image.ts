import {GPT4FunctionDef} from "./types";
import * as ai from "../ai";

const EditLocations = [
    'в центре',
    'слева',
    'справа',
    'сверху',
    'снизу',
    'по бокам',
    'сверху и снизу',
    'в левой половине',
    'в правой половине',
    'в верхней половине',
    'в нижней половине'
]

export const EditImage: GPT4FunctionDef = {
    signature: {
        name: 'edit_image',
        description: 'отредактировать изображение',
        parameters: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'описание изменения'
                },
                location: {
                    type: 'string',
                    description: 'Расположение на картинке'
                }
            },
            required: ['prompt']
        }
    },
    handler: async (message, app, args) => {
        //ai.editImage()
    }
}