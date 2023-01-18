import config from './config.json' assert { type: "json" };
import login from "./login.json" assert { type: "json" };
import {
    Client,
    GatewayIntentBits,
    Message,
    ChatInputCommandInteraction,
    MessageReaction,
    ActivityType
} from "discord.js";
import * as database from "./database.js";
import * as utils from "./utils.js";
import * as ai from "./ai.js";
import * as lang from "./lang.js";
import * as chat from "./chat.js";
import DiscordGateway from "./discord_gateway.js";
import replaceAsync from "string-replace-async";
import {Op} from "sequelize";
import schedule from "node-schedule";
import crypto from "crypto"

class ChatGPTQuery {
    query_list = []
    current

    async push(query) {
        this.query_list.push(query)

        if (!this.current) {
            while (this.query_list.length > 0) {
                this.current = this.query_list.splice(0, 1)[0]
                try {
                    await this.current.func()
                } catch (e) {
                    this.current.err(e)
                }
            }
            this.current = undefined
        }
    }
}

export default class App {
    static instance = null;

    client
    gateway
    potd_scheduler
    image_styles = ['digital art', 'pixel art', 'cartoon style', 'oil painting', 'pastel drawing']
    cached_limit
    chat_gpt_query = new ChatGPTQuery()

    async conversation_gpt3(message) {
        let channel = message.channel

        await channel.sendTyping()

        let text = message.content

        if (text.length > 300) {
            await message.reply({content: `${config.sign} сообщение слишком длинное, я не могу на него ответить`})
            return
        }

        text = text.replaceAll(`<@&${config.bot_role}>`, `<@${this.client.user.id}>`)

        let mentioned = new Map()

        mentioned.set(this.client.user.id, await database.Person.findByPk(this.client.user.id))

        text = await replaceAsync(text, /<@(\d+)>/g, async (match, uid) => {
            let user = mentioned.get(uid)
            if (user === undefined) {
                user = await database.Person.findByPk(uid)
                mentioned.set(uid, user)
            }
            if (!!user) {
                return user.name
            } else {
                return message.mentions.users.get(uid).username
            }
        })

        text = text.replace(/<@&(\d+)>/, (match, rid) => {
            return message.mentions.roles.get(rid).name
        })

        let author = mentioned.get(message.author.id)
        if (author === undefined) {
            author =  await database.Person.findByPk(message.author.id)
            mentioned.set(message.author.id, author)
        }
        let author_name = !!author ? author.name : message.author.username

        let bot = mentioned.get(this.client.user.id)

        let context = `The following is a conversation between ${author_name} and ${bot.name}.`;

        let descriptions = ''
        mentioned.forEach(mention => {
            if (!mention) return
            descriptions += `${mention.bio}\n`
        })

        let history = await database.Conversation.findAll({where: {
                user: message.author.id,
                time: {
                    [Op.gte]: Math.floor(Date.now() / 1000) - 60 * 15
                },
                valid: true
            },
            limit: 10,
            order: [['time', 'DESC']]
        })

        let history_str = ''
        history.forEach(entry => {
            history_str += `${author_name}: ${entry.message}\n${bot.name}: ${entry.reply}\n`
        })

        let prompt = `${context}\n${descriptions}\n${history_str}${author_name}: ${text}\n${bot.name}: `

        console.log(prompt)

        let reply = await ai.conversation(prompt)

        await database.Conversation.create({user: message.author.id, message: text, reply: reply, time: Math.floor(Date.now() / 1000)})

        await message.reply(reply)
    }

    async conversation_chat_gpt(message) {
        return new Promise(async (resolve, reject) => {
            let channel = message.channel

            await channel.sendTyping()

            let text = message.content

            if (text.length > 1000) {
                await message.reply({content: `${config.sign} сообщение слишком длинное, я не могу на него ответить`})
                return
            }

            let mention_role = `<@&${config.bot_role}>`
            let mention_me = `<@${this.client.user.id}>`

            text = text.replaceAll(mention_role, mention_me)

            if (text.startsWith(mention_me)) {
                text = text.substring(mention_me.length)
            }

            let mentioned = new Map()

            mentioned.set(this.client.user.id, {name: 'Assistant'})

            text = await replaceAsync(text, /<@(\d+)>/g, async (match, uid) => {
                let user = mentioned.get(uid)
                if (user === undefined) {
                    user = await database.Person.findByPk(uid)
                    mentioned.set(uid, user)
                }
                if (!!user) {
                    return user.name
                } else {
                    return message.mentions.users.get(uid).username
                }
            })

            text = text.replace(/<@&(\d+)>/, (match, rid) => {
                return message.mentions.roles.get(rid).name
            })

            let conversation_id
            let user_conversation = await database.UserConversation.findByPk(message.author.id)
            if (!!user_conversation) {
                conversation_id = user_conversation.conversation
            }

            let message_id
            if (!!conversation_id) {
                if (!!message.reference) {
                    let referenceMessage = await database.Chat.findOne({where: {chat_conversation: conversation_id, reply: message.reference.messageId}})
                    if (!!referenceMessage) {
                        message_id = referenceMessage.chat_message
                    }
                }
                if (!!message_id) {
                    let latestMessage = await database.Chat.findOne({
                        where: {
                            chat_conversation: conversation_id
                        },
                        order: [['id', 'DESC']]
                    })
                    message_id = latestMessage.chat_message
                }
            }

            await channel.sendTyping()
            let typing = setInterval(async () => {
                await channel.sendTyping()
            }, 3000)

            let callback = async (response) => {
                clearInterval(typing)

                if (!conversation_id) {
                    await chat.setConversationName(response.conversationId, message.author.username)
                    await database.UserConversation.create({user: message.author.id, conversation: response.conversationId})
                }

                let last_reply
                let response_blocks = await utils.format_discord_message(response.text)
                for (let i = 0; i < response_blocks.length; i++) {
                    if (response_blocks[i].length > 2000) {
                        last_reply = await (last_reply || message).reply({files: [{
                                data: Buffer.of(response_blocks[i]),
                                name: crypto.createHash('md5').update(response_blocks[i]).digest('hex') + '.txt'
                            }]})
                    } else {
                        last_reply = await (last_reply || message).reply({content: response_blocks[i]})
                    }
                    await database.Chat.create({user: message.author.id, reply: last_reply.id, chat_message: response.messageId, chat_conversation: response.conversationId})
                }

                resolve()
            }
            let fallback = (err) => {
                clearInterval(typing)
                reject(err)
            }

            if (!!conversation_id) {
                chat.message(text, {conversationId: conversation_id, parentMessageId: message_id}).then(callback).catch(fallback)
            } else {
                chat.message(text).then(callback).catch(fallback)
            }
        })
    }

    constructor() {
        if (App.instance != null) throw new Error('Only one App instance may exist!');

        App.instance = this;

        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions]
        })

        this.client.on('ready', async () => {
            this.cached_limit = await ai.getLimit() * 100

            //await this.client.application.commands.set([])
            await this.client.application.commands.create({
                name: 'forget',
                description: 'забыть все диалоги'
            })
            await this.client.application.commands.create({
                name: 'image',
                description: 'сгенерировать картинку',
                options: [
                    {
                        name: 'query',
                        description: 'описание картинки',
                        type: 3,
                        maxLength: 150
                    }
                ]
            })
            await this.client.application.commands.create({
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
                                description: 'расскажи о себе на английском',
                                type: 3,
                                maxLength: 150,
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
            await this.client.application.commands.create({
                name: 'idea',
                description: 'сгенерировать случайную идею'
            })
            await this.client.application.commands.create({
                name: 'translate',
                description: 'перевести текст',
                options: [
                    {
                        name: 'text',
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
            await this.client.application.commands.create({
                name: 'energy',
                description: 'узнать, сколько у меня осталось энергии на этот месяц'
            })

            let last_potd = new Date(await utils.getGlobal('last_potd', 0) * 1000)
            let now = new Date()

            let schedule_potd
            let send_potd

            schedule_potd = async (from_time) => {
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
                let idea = await ai.idea()
                idea = idea.replaceAll(/[.!]/g, ',')
                idea += ', ' + utils.oneOf(this.image_styles)
                console.log(`${utils.io.marks.event} POTD idea ${idea}`)
                let img = await ai.image(idea)
                console.log(`${utils.io.marks.event} POTD link ${img.url}`)
                await this.client.channels.cache.get(config.general_channel).send({content: `${config.sign} Картинка дня:\n${idea}`, files: [{attachment: img.url, name: idea.replaceAll(/[\s\\\/]/g, '_') + '.png'}]})
            }

            if (Math.floor((now.getTime() - last_potd.getTime()) / 1000) > 60 * 60 * 24) {
                send_potd()
            } else {
                schedule_potd(last_potd)
            }
        })

        this.gateway = new DiscordGateway();

        this.gateway.on('MESSAGE_REACTION_ADD', async (d) => {
            if (d.user_id === this.client.user.id) return

            let pool = await database.RolePool.findOne({where: {message_id: d.message_id}})
            if (!!pool) {
                let guild = this.client.guilds.cache.get(d.guild_id)
                let channel = guild.channels.cache.get(d.channel_id)
                let message = await channel.messages.fetch(d.message_id)
                let role_reaction = await database.Role.findOne({where: {pool_id: pool.id, emoji: d.emoji.name}})
                if (!!role_reaction) {
                    await guild.members.cache.get(d.user_id).roles.add(role_reaction.role)
                } else {
                    await message.reactions.cache.find(reaction => reaction.emoji.name === d.emoji.name).remove()
                }
            }
        });

        this.gateway.on('MESSAGE_REACTION_REMOVE', async (d) => {
            if (d.user_id === this.client.user.id) return

            let pool = await database.RolePool.findOne({where: {message_id: d.message_id}})
            if (!!pool) {
                let guild = this.client.guilds.cache.get(d.guild_id)
                let role_reaction = await database.Role.findOne({where: {pool_id: pool.id, emoji: d.emoji.name}})
                if (!!role_reaction) {
                    await guild.members.cache.get(d.user_id).roles.remove(role_reaction.role)
                }
            }
        });

        this.gateway.on('MESSAGE_CREATE', async (d) => {
            if (d.author.id === this.client.user.id) return

            let message = new Message(this.client, d);
            let channel = message.channel;
            if (channel.type === 1 || message.mentions.has(this.client.user.id) || message.mentions.has(config.bot_role)) {
                this.chat_gpt_query.push({
                    func: () => this.conversation_chat_gpt(message),
                    err: (e) => {
                        console.error(e)
                        if (typeof e === 'object' && e.constructor.name === 'ChatGPTError') {
                            switch (e.statusCode) {
                                case 429:
                                    message.reply({content: `${config.sign} я устала, дай отдохнуть`})
                                    break
                                default:
                                    message.reply({content: `segmentation fault (core dumped)`})
                                    break
                            }
                        }
                    }
                })
            }
        })

        this.gateway.on('INTERACTION_CREATE', async (d) => {
            if (d.type === 2) {
                const unknownCommand = async () => {
                    await command.reply({content: `${config.sign} Какая то непонятная команда :<`})
                }

                let command = new ChatInputCommandInteraction(this.client, d)
                switch (command.commandName) {
                    case 'forget':
                        await command.reply({content: `${config.sign} ${utils.oneOf(['Ладно', 'Окей', 'Хорошо'])}`})
                        await database.Conversation.update({valid: false}, {where: {user: command.user.id}})
                        let conversation = await database.UserConversation.findByPk(command.user.id)
                        await chat.remove(conversation.conversation)
                        await database.UserConversation.destroy({where: {user: command.user.id}})
                        break;
                    case 'image':
                        const rest_interval = 60 * 5

                        let latest_image = await utils.getGlobal('latest_image', 0)
                        let since_latest_image = Math.floor(Date.now() / 1000) - latest_image
                        if (since_latest_image <= rest_interval) {
                            await command.reply({content: `${config.sign} Дай мне отдохнуть еще хотя бы ${rest_interval - since_latest_image} секунд`})
                        } else {
                            await utils.setGlobal('latest_image', Math.floor(Date.now() / 1000))
                            await command.reply({content: `${config.sign} Хорошо, подожди немного`})
                            let idea = command.options.get('query')?.value
                            if (!idea) {
                                idea = (await ai.idea()) + ', ' + utils.oneOf(this.image_styles)
                            }
                            let img = await ai.image(idea)
                            if (img.status === 200) {
                                await command.followUp({content: idea, files: [{attachment: img.url, name: idea.replaceAll(/[\s\\\/]/g, '_') + '.png'}]})
                            } else {
                                switch (img.status) {
                                    case 400:
                                        await command.followUp({content: `${config.sign} плохой запрос`})
                                        break;
                                    default:
                                        await command.followUp({content: `${config.sign} у меня не выходит, ошибка ${img.status}`})
                                        break;
                                }
                            }
                        }
                        break;
                    case 'me':
                        let action = command.options.getSubcommand()
                        switch (action) {
                            case 'update':
                                await command.reply({content: `${config.sign} Хорошо, я запомню`})
                                let bio_src = command.options.get('details').value
                                let data = await ai.fetchBio(bio_src)
                                await database.Person.upsert({user: command.user.id, bio: data.bio, bio_src: bio_src, name: data.name, is_female: data.is_female})
                                break;
                            case 'forget':
                                await database.Person.destroy({where: {user: command.user.id}})
                                await command.reply({content: `${config.sign} Хорошо`})
                                break;
                            case 'print':
                                let person = await database.Person.findByPk(command.user.id)
                                if (!!person) {
                                    let verb = person.is_female ? 'сказала' : 'сказал'
                                    await command.reply({content: `${config.sign} вот что ты мне ${verb}:\n${person.bio_src}`})
                                } else {
                                    await command.reply({content: `${config.sign} я ничего не знаю о тебе, расскажи мне!`})
                                }
                                break;
                            default:
                                await unknownCommand()
                                break;
                        }
                        break;
                    case 'idea':
                        let idea = await ai.idea()
                        await command.reply({content: idea})
                        break;
                    case 'translate':
                        let text = command.options.get('text').value
                        let to = command.options.get('to').value

                        let message_match = text.trim().match(/^https:\/\/discord\.com\/+channels\/+(\d+)\/+(\d+)\/+(\d+)\/*$/)
                        let ref = ''
                        if (!!message_match) {
                            ref = `${message_match[0]}\n`
                            if (command.guildId === message_match[1] && command.channelId === message_match[2]) {
                                let ref_message = await command.channel.messages.fetch(message_match[3])
                                if (!!ref_message) {
                                    text = ref_message.content
                                } else {
                                    await command.reply({content: `${config.sign} я не могу найти это сообщение`})
                                    return
                                }
                            } else {
                                await command.reply({content: `${config.sign} я не хочу переводить сообщения из других каналов`})
                                return
                            }
                        }

                        let translated = await lang.translate(text, to)
                        await command.reply({content: `${ref}${translated}`})
                        break;
                    case 'energy':
                        let usage = await ai.getUsage()
                        let energy_left_percent = 1 - (usage / this.cached_limit)
                        if (energy_left_percent <= 0.01) {
                            await command.reply({content: `${config.sign} у меня не осталось энергии`})
                        } else {
                            await command.reply({content: `${config.sign} у меня осталось еще ${(energy_left_percent * 100).toFixed(2)}% энергии`})
                        }
                        break;
                    default:
                        await unknownCommand()
                        break;
                }
            }
        })
    }

    setRandomStatus() {
        this.client.user.setPresence(utils.oneOf([
            {activities: [{name: 'на еду', type: ActivityType.Watching}]},
            {activities: [{name: 'аниме', type: ActivityType.Watching}]},
            {activities: [{name: 'сюда', type: ActivityType.Watching}]},
            {activities: [{name: 'на свой хвост', type: ActivityType.Watching}]},
            {activities: [{name: 'голове', type: ActivityType.Competing}]},
            {activities: [{name: 'жизнь', type: ActivityType.Playing}]},
            {activities: [{name: 'майнкрафтик', type: ActivityType.Playing}]},
            {activities: [{name: 'Half-Life 3', type: ActivityType.Playing}]},
            {activities: [{name: 'лесу', type: ActivityType.Playing}]},
        ]))
    }

    run () {
        return new Promise((resolve, reject) => {
            this.client.once('ready', () => {
                this.setRandomStatus()
                setInterval(() => this.setRandomStatus(), 1000 * 60 * 5)
                console.log(`${utils.io.marks.status} Client ready!`);
                resolve();
            })

            this.client.login(login.discord_key).then(() => {
                this.gateway.reconnect();
            }, reject);
        })
    }
}