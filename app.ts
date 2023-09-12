import config from './config.json' assert { type: "json" };
import login from "./login.json" assert { type: "json" };
import {
    Client,
    GatewayIntentBits,
    Message,
    ChatInputCommandInteraction,
    ActivityType,
    TextChannel,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ColorResolvable
} from "discord.js";
import * as database from "./database";
import * as utils from "./utils";
import * as ai from "./ai";
import DiscordGateway from "./discord_gateway";
import replaceAsync from "string-replace-async";
import {Op} from "sequelize";
import schedule from "node-schedule";
import {format_discord_message} from "./utils";
import {language, translate} from "./localize";
import {Help} from "./GPT4Functions/help";
import {DrawImage} from "./GPT4Functions/draw_image";
import {EditImage} from "./GPT4Functions/edit_image";
import {QueryDrawStyles} from "./GPT4Functions/query_draw_styles";
import {Translate} from "./GPT4Functions/translate";
import axios from "axios";
import fs from "fs";

const GPT4Functions = [
    Help,
    DrawImage,
    //EditImage,
    QueryDrawStyles,
    Translate,
    //GoogleSearch
]

export default class App {
    static instance: App

    client: Client
    gateway: DiscordGateway
    potd_scheduler: schedule.Job | null = null
    cached_limit: number = 0

    constructor() {
        App.instance = this

        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions]
        })

        this.client.on('ready', async () => {
            this.cached_limit = await ai.getLimit() * 100

            //await this.client.application?.commands.set([])
            await this.client.application?.commands.create({
                name: 'forget',
                description: 'забыть все диалоги'
            })
            await this.client.application?.commands.create({
                name: 'me',
                description: 'управление информацией о себе',
                options: [
                    {
                        name: 'update',
                        description: 'обновить данные о тебе',
                        type: 1,
                        options: [
                            {
                                name: 'details',
                                description: 'расскажи о себе',
                                type: 3,
                                maxLength: 300,
                                required: true
                            }
                        ]
                    },
                    {
                        name: 'forget',
                        description: 'забыть все о тебе',
                        type: 1
                    },
                    {
                        name: 'print',
                        description: 'вывести, что я знаю о тебе',
                        type: 1
                    }
                ]
            })
            await this.client.application?.commands.create({
                name: 'idea',
                description: 'сгенерировать случайную идею'
            })
            await this.client.application?.commands.create({
                name: 'translate',
                description: 'перевести текст',
                options: [
                    {
                        name: 'text_or_link',
                        description: 'текст для перевода или ссылка на сообщение из этого канала',
                        required: true,
                        type: 3,
                        maxLength: 100
                    },
                    {
                        name: 'to',
                        description: 'язык перевода',
                        required: true,
                        type: 3,
                        maxLength: 2,
                        minLength: 2
                    }
                ]
            })
            await this.client.application?.commands.create({
                name: 'energy',
                description: 'узнать, сколько у меня осталось энергии на этот месяц'
            })
            await this.client.application?.commands.create({
                name: 'configure',
                description: 'настройки для сервера',
                defaultMemberPermissions: [PermissionFlagsBits.Administrator],
                options: [
                    {
                        name: 'set',
                        description: 'установить настройку',
                        type: 1,
                        options: [
                            {
                                name: 'property',
                                description: 'параметр',
                                required: true,
                                type: 3,
                                choices: [
                                    {name: 'roles channel', value: 'roles_channel'},
                                    {name: 'potd channel', value: 'potd_channel'}
                                ]
                            },
                            {
                                name: 'value',
                                description: 'значение',
                                required: true,
                                type: 3
                            }
                        ]
                    },
                    {
                        name: 'clear',
                        description: 'удалить настройку',
                        type: 1,
                        options: [
                            {
                                name: 'property',
                                description: 'параметр',
                                required: true,
                                type: 3,
                                choices: [
                                    {name: 'roles channel', value: 'roles_channel'},
                                    {name: 'potd channel', value: 'potd_channel'}
                                ]
                            }
                        ]
                    },
                    {
                        name: 'print',
                        description: 'вывести все настройки',
                        type: 1
                    }
                ]
            })
            await this.client.application?.commands.create({
                name: 'roles',
                description: 'настройки ролей',
                defaultMemberPermissions: [PermissionFlagsBits.Administrator],
                options: [
                    {
                        name: 'pools',
                        description: 'пулы ролей',
                        type: 2,
                        options: [
                            {
                                name: 'add',
                                description: 'добавить пул ролей',
                                type: 1,
                                options: [
                                    {
                                        name: 'id',
                                        description: 'идентификатор',
                                        required: true,
                                        type: 3,
                                        max_length: 10
                                    },
                                    {
                                        name: 'title',
                                        description: 'заголовок',
                                        type: 3,
                                        max_length: 25
                                    },
                                    {
                                        name: 'description',
                                        description: 'описание',
                                        type: 3,
                                        max_length: 200
                                    }
                                ]
                            },
                            {
                                name: 'remove',
                                description: 'удалить пул ролей',
                                type: 1,
                                options: [
                                    {
                                        name: 'id',
                                        description: 'идентификатор',
                                        required: true,
                                        type: 3,
                                        max_length: 10
                                    }
                                ]
                            },
                            {
                                name: 'list',
                                description: 'вывести список пулов ролей',
                                type: 1,
                            },
                            {
                                name: 'update',
                                description: 'обновить сообщение пула',
                                type: 1,
                                options: [
                                    {
                                        name: 'id',
                                        description: 'идентификатор пула',
                                        required: true,
                                        type: 3,
                                        max_length: 10
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'add',
                        description: 'добавить роль в пул',
                        type: 1,
                        options: [
                            {
                                name: 'role',
                                description: 'роль',
                                required: true,
                                type: 8
                            },
                            {
                                name: 'pool_id',
                                description: 'идентификатор пула',
                                required: true,
                                type: 3,
                                max_length: 10
                            },
                            {
                                name: 'emoji',
                                description: 'эмодзи',
                                required: true,
                                type: 3
                            },
                            {
                                name: 'description',
                                description: 'описание',
                                type: 3,
                                max_length: 100
                            }
                        ]
                    },
                    {
                        name: 'remove',
                        description: 'удалить роль из пула',
                        type: 1,
                        options: [
                            {
                                name: 'role',
                                description: 'роль',
                                required: true,
                                type: 8
                            }
                        ]
                    },
                    {
                        name: 'list',
                        description: 'вывести список ролей в пуле',
                        type: 1,
                        options: [
                            {
                                name: 'pool_id',
                                description: 'идентификатор пула',
                                required: true,
                                type: 3,
                                max_length: 10
                            }
                        ]
                    }
                ]
            })
            await this.client.application?.commands.create({
                name: 'history',
                description: 'узнать, какие сообщения я использую для контекста нашего разговора'
            })

            let last_potd = new Date(await utils.getGlobal('last_potd', 0) * 1000)
            let now = new Date()

            let schedule_potd: any
            let send_potd: any

            schedule_potd = async (from_time: Date) => {
                let tomorrow = new Date(from_time.getTime() + 1000 * 60 * 60 * 24)
                let new_time = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0, 0)
                this.potd_scheduler = schedule.scheduleJob(new_time, () => {
                    send_potd()
                })
                console.log(`${utils.io.marks.event} POTD scheduled to ${new_time}`)
            }

            send_potd = async () => {
                await utils.setGlobal('last_potd', Math.floor(Date.now() / 1000))
                schedule_potd(new Date())

                const servers = await database.ServerConfig.findAll({where: {
                            [Op.not]: {
                                potd_channel: null
                            }
                        }
                    }
                )

                if (servers.length > 0) {
                    let idea = await ai.generateIdea()
                    if (typeof idea === 'string') {
                        idea = idea.replaceAll(/[.!]/g, ',')
                        console.log(`${utils.io.marks.event} POTD idea ${idea}`)
                        let imageResult = await ai.drawImage(idea, 'poorly drawn, poorly drawn hands, poorly drawn feet, poorly drawn face, disfigured, bad anatomy', 'anime')

                        if (imageResult instanceof Buffer) {
                            for (let server of servers) {
                                await (this.client.channels.cache.get(server.potd_channel as string) as TextChannel).send({content: `${config.sign} Картинка дня:\n${idea}`, files: [imageResult]})
                            }
                        } else {
                            console.error(`${utils.io.marks.event} Failed to send POTD: status ${imageResult}`)
                        }
                    }
                }
            }

            if (Math.floor((now.getTime() - last_potd.getTime()) / 1000) > 60 * 60 * 24) {
                send_potd()
            } else {
                schedule_potd(last_potd)
            }

            for (let guild of this.client.guilds.cache) {
                await database.ServerConfig.upsert({server_id: guild[1].id})
                const server_config = (await database.ServerConfig.findByPk(guild[1].id))!

                if (server_config.bot_role === null) {
                    await server_config.update({bot_role: guild[1].roles.cache.filter((role) => role.name === this.client.user?.username).at(0)?.id || null})
                }
            }
        })

        this.gateway = new DiscordGateway()

        this.gateway.on('MESSAGE_REACTION_ADD', async (d) => {
            if (d.user_id === this.client.user?.id) return

            let pool = await database.RolePool.findOne({where: {server_id: d.guild_id, message_channel_id: d.channel_id, message_id: d.message_id}})
            if (!!pool) {
                let guild = this.client.guilds.cache.get(d.guild_id)!
                let channel = guild.channels.cache.get(d.channel_id)! as TextChannel
                let message = await channel.messages.fetch(d.message_id)

                let emoji_name = d.emoji.name
                if (d.emoji.id !== null) emoji_name = `<:${d.emoji.name}:${d.emoji.id}>`

                let role_reaction = await database.Role.findOne({where: {pool_id: pool.id, emoji: emoji_name}})
                if (!!role_reaction) {
                    await guild.members.cache.get(d.user_id)!.roles.add(role_reaction.role)
                } else {
                    await message.reactions.cache.find(reaction => reaction.emoji.name === d.emoji.name)?.remove()
                }
            }
        })

        this.gateway.on('MESSAGE_REACTION_REMOVE', async (d) => {
            if (d.user_id === this.client.user!.id) return

            let pool = await database.RolePool.findOne({where: {server_id: d.guild_id, message_channel_id: d.channel_id, message_id: d.message_id}})
            if (!!pool) {
                let guild = this.client.guilds.cache.get(d.guild_id)!

                let emoji_name = d.emoji.name
                if (d.emoji.id !== null) emoji_name = `<:${d.emoji.name}:${d.emoji.id}>`

                let role_reaction = await database.Role.findOne({where: {pool_id: pool.id, emoji: emoji_name}})
                if (!!role_reaction) {
                    await (await guild.members.fetch(d.user_id)).roles.remove(role_reaction.role)
                }
            }
        })

        this.gateway.on('MESSAGE_CREATE', async (d) => {
            if (d.author.id === this.client.user!.id) return

            // @ts-ignore
            let message = new Message(this.client, d)
            const conversation_whitelist = config.conversation_whitelist as false | string[]
            if (message.mentions.has(this.client.user) && (conversation_whitelist === false || conversation_whitelist.includes(message.guildId))) {
                await this.chat(message)
            }
        })

        this.gateway.on('INTERACTION_CREATE', async (d) => {
            if (d.type === 2) {
                const unknownCommand = async () => {
                    await command.editReply({content: `${config.sign} ${translate('I don\'t know this command :<', d.locale)}`})
                }

                // @ts-ignore
                let command = new ChatInputCommandInteraction(this.client, d)
                await command.reply(`${config.sign} ${translate('performing', d.locale)}`)
                switch (command.commandName) {
                    case 'forget':
                        await command.editReply({content: `${config.sign} ${translate('ok', d.locale)}`})
                        await database.Conversation.update({valid: false}, {where: {user: command.user.id}})
                        break
                    case 'me':
                        let action = command.options.getSubcommand()
                        switch (action) {
                            case 'update':
                                let bio_src = command.options.get('details').value
                                let data = await ai.fetchBio(bio_src)
                                await database.Person.upsert({user: command.user.id, bio_3: data.bio_3, bio_2: data.bio_2, bio_src: bio_src, name: data.name, is_female: data.is_female})
                                await command.editReply({content: `${config.sign} ${translate('ok, I\'ll remember', d.locale)}`})
                                break
                            case 'forget':
                                await database.Person.destroy({where: {user: command.user.id}})
                                await command.editReply({content: `${config.sign} ${translate('ok', d.locale)}`})
                                break
                            case 'print':
                                let person = await database.Person.findByPk(command.user.id)
                                if (!!person) {
                                    await command.editReply({content: `${config.sign} ${translate('this is what you told me', d.locale, person.is_female)}:\n${person.bio_src}`})
                                } else {
                                    await command.editReply({content: `${config.sign} ${translate('I don\'t know anything about you. Please, tell me!', d.locale)}`})
                                }
                                break
                            default:
                                await unknownCommand()
                                break
                        }
                        break
                    case 'idea':
                        let idea = await ai.generateIdea()
                        await command.editReply({content: idea})
                        break
                    case 'translate':
                        let text_or_link = command.options.get('text_or_link').value
                        let to = command.options.get('to').value

                        let message_match = text_or_link.trim().match(/^https:\/\/discord\.com\/+channels\/+(\d+)\/+(\d+)\/+(\d+)\/*$/)
                        let ref = ''
                        if (!!message_match) {
                            ref = `${message_match[0]}\n`
                            if (command.guildId === message_match[1] && command.channelId === message_match[2]) {
                                let ref_message = await command.channel.messages.fetch(message_match[3])
                                if (!!ref_message) {
                                    text_or_link = ref_message.content
                                } else {
                                    await command.editReply({content: `${config.sign} я не могу найти это сообщение`})
                                    return
                                }
                            } else {
                                await command.editReply({content: `${config.sign} я не хочу переводить сообщения из других каналов или серверов`})
                                return
                            }
                        }

                        let translated = await ai.translate(text_or_link, to)
                        await command.editReply({content: `${ref}${translated}`})
                        break
                    case 'energy':
                        let usage = await ai.getUsage()
                        let energy_left_percent = 1 - (usage / this.cached_limit)
                        if (energy_left_percent <= 0.01) {
                            await command.editReply({content: `${config.sign} у меня не осталось энергии`})
                        } else {
                            await command.editReply({content: `${config.sign} у меня осталось еще ${(energy_left_percent * 100).toFixed(2)}% энергии`})
                        }
                        break
                    case 'configure':
                        let configure_action = command.options.getSubcommand()
                        switch (configure_action) {
                            case 'set':
                            {
                                let property = command.options.get('property').value
                                let value = command.options.get('value').value

                                const update = {} as any
                                update[property] = value

                                let success = false
                                try {
                                    await database.ServerConfig.update(update, {where: {server_id: command.guildId}})
                                    success = true
                                } catch (e) { }

                                if (success) {
                                    await command.editReply({content: `${config.sign} настройка установлена`})
                                } else {
                                    await command.editReply({content: `${config.sign} не удалось установить настройку`})
                                }
                            }
                                break
                            case 'clear':
                            {
                                const defaults = {
                                    roles_channel: null,
                                    potd_channel: null
                                } as any

                                let property = command.options.get('property').value

                                const update = {} as any
                                update[property] = defaults[property]

                                try {
                                    await database.ServerConfig.update(update, {where: {server_id: command.guildId}})
                                } catch (e) { }

                                await command.editReply({content: `${config.sign} настройка удалена`})
                            }
                                break
                            case 'print':
                            {
                                const server_config = (await database.ServerConfig.findByPk(command.guildId))!
                                let output = ''
                                if (server_config.roles_channel !== null) output += `\n\`roles channel\` <#${server_config.roles_channel}>`
                                if (server_config.potd_channel !== null) output += `\n\`potd channel\` <#${server_config.potd_channel}>`
                                output = output.trim()
                                if (output.length === 0) {
                                    output = 'ни одна настройка не была установлена'
                                }

                                await command.editReply({content: `${config.sign}\n${output}`})
                            }
                                break
                        }
                        break
                    case 'roles':
                        let roles_action = command.options.getSubcommandGroup()
                        switch (roles_action) {
                            case 'pools':
                            {
                                let action = command.options.getSubcommand()
                                switch (action) {
                                    case 'add':
                                    {
                                        let id_param = command.options.get('id').value
                                        let title_param = command.options.get('title')?.value || null
                                        let description_param = command.options.get('description')?.value || null

                                        let existing_pool = await database.RolePool.findOne({where: {server_id: command.guildId, text_id: id_param}})

                                        let message
                                        if (existing_pool !== null) {
                                            message = await this.updateRolePoolMessage(existing_pool, await existing_pool.get_roles())
                                        } else {
                                            message = await this.updateRolePoolMessage({
                                                server_id: command.guildId,
                                                message_channel_id: command.channelId,
                                                message_id: null,
                                                title: title_param,
                                                description: description_param
                                            }, [])
                                        }

                                        if (typeof message === 'string') {
                                            await command.editReply(message)
                                        } else {
                                            await database.RolePool.upsert({text_id: id_param, title: title_param, message_id: message.id, message_channel_id: message.channelId, server_id: command.guildId})
                                            await command.editReply(`${config.sign} [пул](${this.constructMessageLink(command.guildId, message.channelId, message.id)}) обновлен`)
                                        }
                                    }
                                        break
                                    case 'remove':
                                    {
                                        let id = command.options.get('id').value

                                        const existing_pool = await database.RolePool.findOne({where: {server_id: command.guildId, text_id: id}})
                                        if (existing_pool !== null) {
                                            const existing_message = await this.fetchMessage(existing_pool.server_id, existing_pool.message_channel_id, existing_pool.message_id)
                                            if (existing_message !== null) {
                                                await existing_message.delete()
                                            }

                                            await database.Role.destroy({where: {pool_id: existing_pool.id}})
                                            await existing_pool.destroy()

                                            await command.editReply(`${config.sign} пул ролей удален`)
                                        } else {
                                            await command.editReply(`${config.sign} пул ролей не найден`)
                                        }

                                    }
                                        break
                                    case 'list':
                                    {
                                        const role_pools = await database.RolePool.findAll({where: {server_id: command.guildId}})
                                        const output = role_pools.map((pool) => `\`${pool.text_id}\` - [${pool.title}](${this.constructMessageLink(pool.server_id, pool.message_channel_id, pool.message_id)})`).join('\n')
                                        await command.editReply(output.length === 0 ? 'Пулы ролей не были добавлены для этого сервера' : output)
                                    }
                                        break
                                    case 'update':
                                    {
                                        let id = command.options.get('id').value

                                        const existing_pool = await database.RolePool.findOne({where: {server_id: command.guildId, text_id: id}})
                                        if (existing_pool !== null) {
                                            await this.updateRolePoolMessage(existing_pool, await existing_pool.get_roles())

                                            await command.editReply(`${config.sign} [пул](${this.constructMessageLink(existing_pool.server_id, existing_pool.message_channel_id, existing_pool.message_id)}) ролей бновлен`)
                                        } else {
                                            await command.editReply(`${config.sign} пул ролей не найден`)
                                        }
                                    }
                                        break
                                }
                            }
                                break
                            case null:
                            {
                                let action = command.options.getSubcommand()
                                switch (action) {
                                    case 'add':
                                    {
                                        let role_param = command.options.get('role').value
                                        let pool_id_param = command.options.get('pool_id').value
                                        let emoji_param = command.options.get('emoji').value
                                        //let description_param = command.options.get('description')?.value || null

                                        const pool = await database.RolePool.findOne({where: {server_id: command.guildId, text_id: pool_id_param}})
                                        if (pool !== null) {
                                            await database.Role.upsert({role: role_param, pool_id: pool.id, emoji: emoji_param})

                                            const roles = await pool.get_roles()
                                            const message = await this.updateRolePoolMessage(pool, roles)

                                            if (typeof message === 'string') {
                                                await command.editReply(message)
                                            } else {
                                                await command.editReply(`${config.sign} роль добавлена в [пул](${this.constructMessageLink(pool.server_id, pool.message_channel_id, pool.message_id)})`)
                                            }
                                        } else {
                                            await command.editReply({content: `${config.sign} пул ролей не найден`})
                                        }
                                    }
                                        break
                                    case 'remove':
                                    {
                                        let role_param = command.options.get('role').value

                                        const role = await database.Role.findOne({
                                            where: {
                                                role: role_param,
                                                '$RolePool.server_id$': command.guildId
                                            },
                                            include: [
                                                {
                                                    model: database.RolePool,
                                                    required: false
                                                }
                                            ]
                                        })
                                        if (role !== null) {
                                            const pool = await role.get_pool()

                                            await role.destroy()

                                            if (pool !== null) {
                                                const roles = await pool.get_roles()
                                                const message = await this.updateRolePoolMessage(pool, roles)
                                                if (typeof message === 'string') {
                                                    await command.editReply(message)
                                                } else {
                                                    await command.editReply(`${config.sign} роль удалена из [пула](${this.constructMessageLink(pool.server_id, pool.message_channel_id, pool.message_id)})`)
                                                }
                                            }
                                        }
                                    }
                                        break
                                    case 'list':
                                    {
                                        let pool_id = command.options.get('pool_id').value

                                        const pool = await database.RolePool.findOne({where: {server_id: command.guildId, text_id: pool_id}})
                                        if (pool !== null) {
                                            const roles = await database.Role.findAll({where: {pool_id: pool.id}})
                                            if (roles.length > 0) {
                                                await command.editReply({content: `${roles.map((role) => `${role.emoji} <@&${role.role}>`).join('\n')}`})
                                            } else {
                                                await command.editReply({content: `${config.sign} в этом пуле нет ролей`})
                                            }
                                        } else {
                                            await command.editReply({content: `${config.sign} пул ролей не найден`})
                                        }
                                    }
                                        break
                                }
                            }
                                break
                        }
                        break
                    case 'history':
                    {
                        let history = (await database.Conversation.findAll({where: {
                                user: command.user.id,
                                time: {
                                    [Op.gte]: Math.floor(Date.now() / 1000) - config.conversation_limit_time
                                },
                                valid: true
                            }
                        })).map(entry => ({server: entry.server, channel: entry.channel, user: entry.message, ai: entry.reply_list()}))

                        const conversation_history = []

                        for (let i = history.length - 1; i >= 0 && conversation_history.length < config.conversation_limit_length; i--) {
                            const message_user = await this.fetchMessage(history[i].server, history[i].channel, history[i].user)
                            if (message_user !== null) {
                                const message_ai = []
                                for (let reply of history[i].ai) {
                                    message_ai.push(await this.fetchMessage(history[i].server, history[i].channel, reply))
                                }
                                if (!message_ai.includes(null)) {
                                    conversation_history.unshift({
                                        user: message_user,
                                        ai: message_ai as Message[]
                                    })
                                }
                            }
                        }

                        if (conversation_history.length > 0) {
                            await command.editReply(`${config.sign} ${translate('these messages I will use as a context for our conversation', d.locale)}\n${conversation_history.map((message) => `${translate('you', d.locale)}: ${this.constructMessageLink(message.user.guildId, message.user.channelId, message.user.id)}\n${message.ai.map((reply) => `${translate('me', d.locale)}: ${this.constructMessageLink(reply.guildId!, reply.channelId, reply.id)}`).join('\n')}`).join('\n')}`)
                        } else {
                            await command.editReply(`${config.sign} ${translate('I can\'t find any messages I could use as a context for our conversation', d.locale)}`)
                        }
                    }
                        break
                    default:
                        await unknownCommand()
                        break
                }
            }
        })
    }

    async registerChatEntry(message: Message, responses: Message[], hastebins?: { [key: string]: string }, transcription?: string) {
        await database.Conversation.create({user: message.author.id, server: message.guildId!, channel: message.channelId, message: message.id, replies: responses.map((response) => response.id).join(' '), time: Math.floor(Date.now() / 1000), hastebins: JSON.stringify(hastebins ?? {})})
    }

    chat(message: Message) {
        return new Promise<void>(async (resolve) => {
            const lang = ((await message.guild?.fetch())?.preferredLocale || 'en') as language

            let channel = message.channel

            await channel.sendTyping()
            let typing_timer = setInterval(async () => {
                await channel.sendTyping()
            }, 2000)

            const mentioned: Map<string, database.Person | null> = new Map()
            const server_config = (await database.ServerConfig.findByPk(message.guildId!))!

            const process_message_text = async (message: Message) => {
                if (message.attachments.size == 1 && message.attachments.at(0)!.name == 'voice-message.ogg') {
                    try {
                        var transcriptionRecord = await database.Transcription.findOne({where: {server: message.guildId!, channel: message.channelId, message: message.id}})
                        if (!!transcriptionRecord) return transcriptionRecord.transcription

                        var voiceMessageResponse = await axios.get(message.attachments.at(0)!.url, {
                            responseType: 'arraybuffer'
                        })
                        var transcription = await ai.transcript(voiceMessageResponse.data as Buffer, lang)
                        await database.Transcription.create({server: message.guildId!, channel: message.channelId, message: message.id, transcription: transcription})
                        return transcription
                    } catch (e) {
                        console.error(e)
                        return ''
                    }
                }

                let text = message.content.trim()
                //if (text.length > 300) {
                //    await message.reply({content: `${config.sign} сообщение слишком длинное, я не могу на него ответить`})
                //    return
                //}
                if (server_config.bot_role !== null) {
                    text = text.replaceAll(`<@&${server_config!.bot_role}>`, `<@${this.client.user!.id}>`)
                }

                if (text.startsWith(`<@${this.client.user!.id}>`)) {
                    text = text.substring(`<@${this.client.user!.id}>`.length).trim()
                }

                //mentioned.set(this.client.user!.id, await database.Person.findByPk(this.client.user!.id))
                text = await replaceAsync(text, /<@(\d+)>/g, async (match, uid) => {
                    let user = mentioned.get(uid)
                    if (user === undefined) {
                        user = await database.Person.findByPk(uid)
                        mentioned.set(uid, user)
                    }

                    if (!!user) {
                        return user.name
                    } else {
                        return message.mentions.users.get(uid)!.username
                    }
                })

                text = text.replace(/<@&(\d+)>/, (match, rid) => {
                    return message.mentions.roles.get(rid)!.name
                })

                return text
            }

            let history = (await database.Conversation.findAll({where: {
                    user: message.author.id,
                    time: {
                        [Op.gte]: Math.floor(Date.now() / 1000) - config.conversation_limit_time
                    },
                    valid: true
                }
            })).map(entry => ({server: entry.server, channel: entry.channel, user: entry.message, ai: entry.reply_list(), hastebins: JSON.parse(entry.hastebins)}))

            const conversation_history = []

            for (let i = history.length - 1; i >= 0 && conversation_history.length < config.conversation_limit_length; i--) {
                const message_user = await this.fetchMessage(history[i].server, history[i].channel, history[i].user)
                if (message_user !== null) {
                    const message_ai = []
                    for (let reply of history[i].ai) {
                        message_ai.push(await this.fetchMessage(history[i].server, history[i].channel, reply))
                    }
                    if (!message_ai.includes(null)) {
                        conversation_history.unshift({
                            user: await process_message_text(message_user),
                            ai: message_ai.map((message) => message!.content).join().replaceAll(/https:\/\/hastebin\.com\/share\/\w+/g, (str) => {
                                const match = /https:\/\/hastebin\.com\/share\/(\w+)/.exec(str)!
                                if (history[i].hastebins[match[1]] !== undefined) {
                                    return '```\n' + history[i].hastebins[match[1]] + '\n```'
                                } else {
                                    return str
                                }
                            })
                        })
                    }
                }
            }

            var message_text = await process_message_text(message)

            let author = mentioned.get(message.author.id)
            if (author === undefined) {
                author =  await database.Person.findByPk(message.author.id)
                mentioned.set(message.author.id, author)
            }

            let context = ''
            for (let mention of mentioned) {
                if (mention[1] === null) continue
                context += `${mention[0] === message.author.id ? mention[1].bio_2 : mention[1].bio_3}\n`
            }

            context += translate('Current time is {}.', lang).replace('{}', `${new Date().getHours()}:${new Date().getMinutes()}`) + '\n'
            //context += translate('Today I talked to {} people.', lang).replace('{}', String(4)) + '\n'

            ai.chat(context, conversation_history, message_text, lang, message.author.id, GPT4Functions.map(func => func.signature)).then(async (reply) => {
                clearInterval(typing_timer)

                if (reply !== undefined) {
                    if (typeof(reply) === "string") {
                        const formatted = await format_discord_message(reply)
                        const reply_messages: Message[] = []
                        let message_reply = message
                        for (let part of formatted.parts) {
                            message_reply = await message_reply.reply(part)
                            reply_messages.push(message_reply)
                        }

                        await this.registerChatEntry(message, reply_messages, formatted.hastebins)
                    }
                    else if (typeof(reply) === 'object') {
                        const gptFunction = GPT4Functions.find(func => func.signature.name == reply.name)
                        if (!!gptFunction)
                        {
                            await gptFunction.handler(message, this, reply.arguments)
                        }
                    } else {
                        switch (reply) {
                            case 429:
                                const reply_message = await message.reply('Подожди, дай отдохнуть, напиши позже.')
                                await database.Conversation.create({user: message.author.id, server: message.guildId!, channel: message.channelId, message: message.id, replies: reply_message.id, time: Math.floor(Date.now() / 1000), hastebins: '{}'})
                                break
                            default:
                                await message.reply(`segmentation fault (core dumped) ${reply}`)
                                break
                        }
                    }
                }
                resolve()
            })
        })
    }

    private async fetchMessage(server: string, channel: string, message: string) {
        try {
            return await ((await (await this.client.guilds.fetch(server)).channels.fetch(channel))! as TextChannel).messages.fetch(message)
        } catch (e) {
            return null
        }
    }

    private constructRolesPoolEmbed(pool: {title: string | null, description: string | null}, roles: {emoji: string, role: string}[]) {
        const embed = new EmbedBuilder()
            .setColor(config.main_color as ColorResolvable)

        if (pool.title !== null) embed.setTitle(pool.title)

        const description = (pool.description !== null ? pool.description + '\n' : '' + roles.map((role) => `${role.emoji} <@&${role.role}>`).join('\n')).trim()

        if (description.length > 0) {
            embed.setDescription(description)
        }

        return embed
    }

    private async updateRolePoolMessage(pool: {server_id: string, message_channel_id: string, message_id: string | null, title: string | null, description: string | null}, roles: {emoji: string, role: string}[]) {
        const embed = this.constructRolesPoolEmbed(pool, roles)

        let message: Message | null = null
        if (pool.message_id !== null) {
            try {
                message =  await ((await (await this.client.guilds.fetch(pool.server_id)).channels.fetch(pool.message_channel_id)) as TextChannel).messages.fetch(pool.message_id)
            } catch (e) { }
        }

        if (message !== null) {
            await message.edit({content: '', embeds: [embed]})
        } else {
            const server_config = await database.ServerConfig.findByPk(pool.server_id)
            if (server_config!.roles_channel !== null) {
                try {
                    message = await ((await (await this.client.guilds.fetch(pool.server_id)).channels.fetch(server_config!.roles_channel)) as TextChannel).send({content: '', embeds: [embed]})
                } catch (e) {
                    return `${config.sign} не удалось создать сообщение для пула ролей`
                }
            } else {
                return `${config.sign} канал для ролей не указан`
            }
        }

        const roles_emoji = roles.map((role) => role.emoji)

        for (let reaction of message.reactions.cache) {
            if (roles_emoji.includes(reaction[1].emoji.toString())) {
                roles_emoji.splice(roles_emoji.indexOf(reaction[1].emoji.toString()), 1)
            } else {
                await reaction[1].remove()
            }
        }

        for (let role_emoji of roles_emoji) {
            await message.react(role_emoji)
        }

        return message
    }

    private constructMessageLink(server_id: string, channel_id: string, message_id: string) {
        return `https://discord.com/channels/${server_id}/${channel_id}/${message_id}`
    }

    setRandomStatus() {
        this.client.user!.setPresence(utils.oneOf([
            {activities: [{type: ActivityType.Watching, name: 'на еду'}]},
            {activities: [{type: ActivityType.Watching, name: 'аниме'}]},
            {activities: [{type: ActivityType.Watching, name: 'сюда'}]},
            {activities: [{type: ActivityType.Watching, name: 'на свой хвост'}]},
            {activities: [{type: ActivityType.Watching, name: 'на тебя'}]},
            {activities: [{type: ActivityType.Competing, name: 'голове'}]},
            {activities: [{type: ActivityType.Competing, name: 'самокопании с собой'}]},
            {activities: [{type: ActivityType.Playing, name: 'жизнь'}]},
            {activities: [{type: ActivityType.Playing, name: 'майнкрафтик'}]},
            {activities: [{type: ActivityType.Playing, name: 'Half-Life 3'}]},
            {activities: [{type: ActivityType.Playing, name: 'лесу'}]},
            {activities: [{type: ActivityType.Listening, name: 'сигналы из космоса'}]},
            {activities: [{type: ActivityType.Listening, name: 'радиоволны'}]}
        ]))
    }

    run () {
        return new Promise<void>((resolve, reject) => {
            this.client.once('ready', () => {
                this.setRandomStatus()
                setInterval(() => this.setRandomStatus(), 1000 * 60 * 5)
                console.log(`${utils.io.marks.status} Client ready!`)
                resolve()
            })

            this.client.login(login.discord_key).then(() => {
                this.gateway.reconnect()
            }, reject)
        })
    }
}