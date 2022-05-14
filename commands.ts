import {Message, MessageEmbed, TextBasedChannel} from "discord.js";
import config from './config.json';
import Database from "./database";
import {oneOf} from "./utils";

async function helpCommand(args: Array<string>, command_message: Message) {
    if (command_message.author.id == config.draco_id) {
        await command_message.reply('В душе я с тобой, солнышко ' + config.sign)
    } else {
        await command_message.reply('Никто тебе не поможет ' + config.sign)
    }
}

const nope_options = ['ага, щас', 'еще чего', 'слыш', 'нет))', 'не-а', `я подчиняюсь только <@${config.draco_id}>`]

async function tellCommand(args: Array<string>, command_message: Message) {
    if (command_message.author.id == config.draco_id) {
        if (command_message.reference != null) {
            const target = await command_message.fetchReference()
            await target.reply(command_message.content.substring(command_message.content.indexOf(args[1]) + args[1].length)); // reply as well
        } else {
            command_message.channel.send(command_message.content.substring(command_message.content.indexOf(args[1]) + args[1].length)); // do a simple tell
        }
    } else {
        await command_message.reply(oneOf(nope_options));
        return
    }

    await command_message.delete();
}

async function reactCommand(args: Array<string>, command_message: Message) {
    if (command_message.author.id == config.draco_id) {
        if (command_message.reference != null) {
            const reference_message = await command_message.fetchReference();
            if (reference_message) {
                try {
                    for (let i = 2; i < args.length; i++) {
                        await reference_message.react(args[i]);
                    }
                } catch (e) {

                }
            }
        }
    } else {
        await command_message.reply(oneOf(nope_options));
        return
    }

    await command_message.delete();
}

async function unreactCommand(args: Array<string>, command_message: Message) {
    if (command_message.author.id == config.draco_id) {
        if (command_message.reference != null) {
            command_message.channel.messages.cache.delete(command_message.reference.messageId);
            const reference_message = await command_message.fetchReference();
            if (reference_message != null) {
                try {
                    for (let i = 2; i < args.length; i++) {
                        await reference_message.reactions.cache.get(args[i]).users.remove(command_message.guild.me.id);
                    }
                } catch (e) {

                }
            }
        }
    } else {
        await command_message.reply(oneOf(nope_options));
        return
    }

    await command_message.delete()
}

async function updateFurryPostCommand(args: Array<string>, command_message: Message) {
    const furry_message = await (command_message.guild.channels.cache.get(config.roles_channel) as TextBasedChannel).messages.fetch(config.furry_message);
    Database.connection.all('SELECT name, emoji FROM furries', (err, rows) => {
        const embed = new MessageEmbed()
            .setColor('#AA7CFF')
            .setTitle('Специальные роли для фурри')
            .setDescription(rows.map(row => `${row.emoji}    ${row.name}`).join('\n'));

        furry_message.edit({content: config.sign, embeds: [embed]});
    })

    await command_message.delete();
}

type CommandFunction = (args: Array<string>, command_message: Message) => void;

export interface CommandInfo {
    description?: string
    format?: string
    hidden?: boolean
    action: CommandFunction
    roles?: Array<string>
}

export class Command {
    description: string
    format: string
    hidden: boolean
    action: CommandFunction
    roles: Array<string>

    constructor(info: CommandInfo) {
        this.description = info.description || ''
        this.format = info.format || ''
        this.hidden = info.hidden || false
        this.action = info.action
        this.roles = info.roles || []
    }
}

export default new Map<string, Command>(Object.entries({
    tell: new Command({description: `Отправить соообщение от моего имени\nТолько для <@${config.draco_id}>`, format: '[сообщение]', hidden: true, action: tellCommand}),
    react: new Command({description: `Поставить реакцию от моего имени\nТолько для <@${config.draco_id}>`, format: '[эмодзи 1] [эмодзи 2] ...', hidden: true, action: reactCommand}),
    unreact: new Command({description: `Убрать реакцию от моего имени\nТолько для <@${config.draco_id}>`, format: '[эмодзи 1] [эмодзи 2] ...', hidden: true, action: unreactCommand}),
    update_furry_post: new Command({description: 'Обновить пост для фурри', action: updateFurryPostCommand, roles: [config.admin_role]}),
    help: new Command({description: 'Попросить о помощи', hidden: true, action: helpCommand})
}));