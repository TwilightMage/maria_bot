import {ChatCompletionFunctions} from "openai/api";
import {Message} from "discord.js";

declare interface GPT4FunctionContext {
    message: Message
    app: App
    args: any

}

declare interface GPT4FunctionDef {
    signature: ChatCompletionFunctions,
    handler: (message: Message, app: App, args: any) => Promise<void>
}