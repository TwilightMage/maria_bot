import {Message} from "discord.js";
import {oneOf} from "./utils";
import config from './config.json';
import {TextGenerator, TextPartOptional, TextPartOptions, TextPartsOptional} from "./text_generator";
import RandomSeed from 'random-seed';

export default class Talk {
    static async handle(message: Message) {
        const text = message.content.substring(message.content.indexOf('>') + 1).trim().toLowerCase();

        if (/^кусь(\s+за\s+\w+)?!*$/.test(text)) {
            await message.reply(oneOf(['Кусь за ушко!', 'Кусь за жопку!', 'Кусь за хвостик!', 'Кусь!']));
        } else if (/^мяу!*$/.test(text)) {
            await message.reply('Мяу!');
        } else if (/^пипяу!*$/.test(text)) {
            await message.reply('Ага')
        } else if (/^иди\s+на\s?хуй!*$/.test(text)) {
            if (message.author.id == config.draco_id) {
                await message.reply(oneOf(['Зачем ты так со мной? :cry:', 'Я буду плакать', ':confounded:', ':persevere:']))
            } else {
                await message.reply('Нет ты иди')
            }
        } else if (/^дай админку!*$/.test(text)) {
            if (message.author.id == config.draco_id || message.member.roles.cache.has(config.admin_role)) {
                await message.reply(oneOf(['У тебя уже, але))', 'Эмм...', 'У тебя уже есть']));
            } else {
                await message.reply(oneOf(['Нет', 'Не-а)', 'А может тебя забанить?))', 'Слыш?)', 'Ага, щас)']));
            }
        } else if(/^х[ао](чу|цю)\s+(п[ие]зду|быть\s+ц[ыи]ск[ао]й|(б[ао]льши[ие]\s+)?сиськи|(б[ао]льшую\s+)?грудь|(б[ао]льшую\s+)(ж[ео]пк?у|задни(ц|чк)у))!*$/.test(text)) {
            const reply_option = oneOf(['Все хотят', 'А кто не хочет?', 'Понимаю', 'Панимяу', 'Может быть, однажды будет', new TextGenerator(new TextPartsOptional(new TextPartOptional('да,'), new TextPartOptional('понимаю,'), new TextPartOptional(new TextPartOptions('и я', 'я тоже', 'и я тоже', 'то же самое'))))])
            let reply_string: string;
            if (typeof reply_option == 'string') reply_string = reply_option;
            else {
                reply_string = reply_option.resolve().trim().replace(/,$/g, '');
                reply_string = reply_string[0].toUpperCase() + reply_string.substring(1);
            }
            await message.reply(reply_string);
        } else if (/^(а\s+)?кто\s+тв[ао]я\s+(мама|мамка|мамуля|мамочка|мать)\?*$/.test(text)) {
            await message.reply({
                content: oneOf([`<@${config.draco_id}> моя мама :heart:`, `Моя мама <@${config.draco_id}> :heart:`, `Я дочка <@${config.draco_id}> :heart:`, `Я творение <@${config.draco_id}> :heart:`]),
                allowedMentions: {users: []}
            })
        } else {
            const regex_1 = /^(а\s+)?(го|давай|пошли)\s+(.*)/;
            const regex_1_match = regex_1.exec(text);
            if (regex_1_match != null) {
                const now = new Date();
                const agreed = RandomSeed.create(`${regex_1_match[3]}${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}`).random() > 0.5;
                if (agreed) {
                    await message.reply(oneOf(['Го', 'Давай', 'Пошли', 'Окей']));
                } else {
                    await message.reply(oneOf([`Не ${regex_1_match[2]}`, 'Нет', 'Не хочу', 'Я сейчас занята', 'У меня голова болит', 'Ты что!?']));
                }
            } else if (/\?$/.test(text)) {
                await message.reply(oneOf(['Даже и не знаю, что сказать', 'Не знаю', 'Хз', 'Не поняла']))
            } else {
                await message.reply(oneOf(['Даже и не знаю, что сказать', 'Пипяу!', 'Ок', 'Бывает', 'Не поняла']))
            }
        }
    }
}