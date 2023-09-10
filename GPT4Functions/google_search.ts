import {GPT4FunctionDef} from "./types";
import {language, translate} from "../localize";
import {google_search} from "../google";
import {BaseGuildTextChannel, ColorResolvable, EmbedBuilder} from "discord.js";
import {URL} from "node:url";
import config from "../config.json";

export const GoogleSearch: GPT4FunctionDef = {
    signature: {
        name: 'google_search',
        description: 'найти информацию в интернете о конкретном человеке',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'определение человека'
                }
            },
            required: ['query']
        }
    },
    handler: async (message, app, args) => {
        var query = args.query ?? ''

        const locale = ((await message.guild?.fetch())?.preferredLocale || 'en') as language
        const response = await google_search(query, (message.channel as BaseGuildTextChannel).nsfw, locale)
        if (!!response.knowledge_panel.type || !!response.knowledge_panel.title || !!response.knowledge_panel.description) {
            const knowledge_panel = response.knowledge_panel
            let source_str = ''
            if (knowledge_panel.url)
            {
                source_str = `[${new URL(knowledge_panel.url).hostname}](${knowledge_panel.url})`
            }
            let embed = new EmbedBuilder()
                .setColor(config.main_color as ColorResolvable)
                .setTitle(knowledge_panel.title)
                .setDescription(`**${knowledge_panel.type}**\n${knowledge_panel.description}\n${source_str}`)

            for (let metadata of knowledge_panel.metadata) {
                embed.addFields({
                    name: metadata.title,
                    value: metadata.value,
                    inline: true
                })
            }

            if (knowledge_panel.books.length > 0) {
                embed.addFields({
                    name: translate('Books', locale),
                    value: knowledge_panel.books.map(book => book.title).join(', '),
                    inline: true
                })
            }

            if (knowledge_panel.tv_shows_and_movies.length > 0) {
                embed.addFields({
                    name: translate('TV shows and movies', locale),
                    value: knowledge_panel.tv_shows_and_movies.map(show => show.title).join(', '),
                    inline: true
                })
            }

            if (knowledge_panel.ratings.length > 0) {
                embed.addFields({
                    name: translate('Ratings', locale),
                    value: knowledge_panel.ratings.join(', '),
                    inline: true
                })
            }

            if (knowledge_panel.available_on.length > 0) {
                embed.addFields({
                    name: translate('Available on', locale),
                    value: knowledge_panel.available_on.join(', '),
                    inline: true
                })
            }

            if (knowledge_panel.songs.length > 0) {
                embed.addFields({
                    name: translate('Songs', locale),
                    value: knowledge_panel.songs.map(song => `${song.title} (${song.album})`).join(', '),
                    inline: true
                })
            }

            if (knowledge_panel.socials.length > 0) {
                embed.addFields({
                    name: translate('Socials', locale),
                    value: knowledge_panel.socials.map(social => `[${social.name}](${social.url})`).join(', '),
                    inline: true
                })
            }

            await message.reply({embeds: [embed], content: translate('This is what I found', locale) + ':'})
            return
        }

        if (response.results.length > 0) {
            if (response.results.length > 5) {
                response.results.length = 5
            }
            await message.reply({content: translate('I\'ve found these', locale) + ':\n\n' + response.results.map(result => `**${result.title}**\n${result.url}\n${result.description}`).join('\n\n'), flags: 'SuppressEmbeds'})
            return
        }

        await message.reply({content: translate('I found nothing', locale)})
    }
}