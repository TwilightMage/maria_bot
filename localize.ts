export const language_list = [
    'en',
    'ru'
] as const

export type language = typeof language_list[number]

export const text_map: {
    [K in language]: {
        [key: string]: string
    }
} = {
    'en': {
    },
    'ru': {
        'I don\'t know this command :<' : 'Какая то непонятная команда :<',
        'performing': 'выполняю',
        'ok, wait a little': 'хорошо, подожди немного',
        'let me rest at least {} seconds more': 'дай мне отдохнуть еще хотя бы {} секунд',
        'bad request': 'плохой запрос',
        'I can\'t, error {}': 'у меня не выходит, ошибка {}',
        'ok, I\'ll remember': 'хорошо, я запомню',
        'ok': 'хорошо',
        'this is what you told me': 'вот что ты мне о себе сказал<s|а>',
        'I don\'t know anything about you. Please, tell me!': 'Я ничего не знаю о тебе. Расскажи мне!',
        'these messages I will use as a context for our conversation': 'эти сообщения я буду использовать для контекста нашего разговора',
        'I can\'t find any messages I could use as a context for our conversation': 'я не могу найти сообщений которые я могла бы использовать в качестве контекста для нашего разговора',
        'you': 'ты',
        'me': 'я',
        'Current time is {}.': 'Время в моем мире сейчас: {}.',
        'Today I talked to {} people.': 'Сегодня я говорила с {} людьми.',
        'This is what I found': 'Вот что мне удалось найти',
        'Books': 'Книги',
        'TV shows and movies': 'ТВ шоу и фильмы',
        'Ratings': 'Рейтинги',
        'Available on': 'Доступно на',
        'Songs': 'Песни',
        'Socials': 'Социальный сети',
        'Source': 'Источник',
        'I\'ve found these': 'Я нашла это',
        'I found nothing': 'Я ничего не нашла'
    }
}

export function translate(text: string, lang: language, is_female?: boolean) {
    if (!language_list.includes(lang)) lang = 'en'
    if (is_female === undefined) is_female = false

    const map = text_map[lang]
    let translated = map[text]
    if (translated !== undefined) {
        const sex_regex = /<s(\w*?)\|(\w*?)>/g
        translated = translated.replaceAll(sex_regex, (str) => {
            const capture = sex_regex.exec(str)!
            return !is_female ? capture[1] : capture[2]
        })
        return translated
    } else {
        return text
    }
}