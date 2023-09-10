import {Client, EmbedBuilder, Message} from "discord.js";
import DiscordGateway from "./discord_gateway";
import schedule from "node-schedule";

declare class App {
    static instance: App

    client: Client
    gateway: DiscordGateway
    potd_scheduler: schedule.Job | null
    cached_limit: number

    constructor()
    registerConversationEntry(message: Message, responses: Message[], hastebins?: { [key: string]: string }): Promise<Message>
    conversation(message: Message): Promise<Message>

    private fetchMessage(server: string, channel: string, message: string): Promise<Message | null>
    private constructRolesPoolEmbed(pool: {title: string | null, description: string | null}, roles: {emoji: string, role: string}[]): EmbedBuilder
    private updateRolePoolMessage(pool: {server_id: string, message_channel_id: string, message_id: string | null, title: string | null, description: string | null}, roles: {emoji: string, role: string}[]): Promise<string | Message>
    private constructMessageLink(server_id: string, channel_id: string, message_id: string): string

    setRandomStatus()
    run()
}