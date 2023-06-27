import login from "./login.json" assert { type: "json" };
import * as database from "./database";
import hljs from "highlight.js/lib/core";

let langs_miss = ['gdscript']
let langs = ['xml', 'cpp', 'csharp', 'javascript', 'bash', 'ruby', 'cmake', '1c', 'ada', 'basic', 'brainfuck', 'css', 'delphi', 'dockerfile', 'fortran', 'go', 'gradle', 'groovy', 'haskell', 'json', 'java', 'kotlin', 'latex', 'lisp', 'lua', 'makefile', 'markdown', 'mathematica', 'nginx', 'php', 'perl', 'powershell', 'python', 'qml', 'rust', 'sql', 'typescript', 'vbscript', 'x86asm', 'yaml']
for (let i = 0; i < langs.length; i++) {
    hljs.registerLanguage(langs[i], (await import(`highlight.js/lib/languages/${langs[i]}`)).default)
}
console.log(`\x1b[34m###\x1b[0m Syntax detection ready!`)

export function oneOf(items: any[]) {
    return items[Math.floor(Math.random() * items.length)]
}

export function oneOfIndex(items: any[]) {
    return Math.floor(Math.random() * items.length)
}

export async function setGlobal(name: string, value: any) {
    await database.Global.upsert({name: name, value: value})
}

export async function getGlobal(name: string, default_value?: any) {
    return (await database.Global.findByPk(name))?.value || default_value;
}

export async function format_discord_message(text: string) {
    const hastebins = {} as {
        [key: string]: string
    }

    for (let code_block of text.matchAll(/`{3}.*?`{3}/gs)) {
        let language = hljs.highlightAuto(code_block[0].substring(3, code_block[0].length - 3)).language || ''
        text = text.replace(code_block[0], `\`\`\`${language}${code_block[0].substring(3)}`)
    }

    if (text.length <= 2000) {
        return {
            parts: [text],
            hastebins: hastebins
        }
    } else {
        let code_blocks = []
        for (let code_block of text.matchAll(/`{3}.*?`{3}/gs)) {
            if (code_block[0].split('\n').length - 2 > 10) {
                code_blocks.push({
                    start: code_block.index!,
                    length: code_block[0].length!
                })
            }
        }

        code_blocks.sort((a, b) => b.length - a.length)

        let size = text.length
        let clip_code_blocks_count = 0
        for (let i = 0; i < code_blocks.length; i++) {
            clip_code_blocks_count++
            if (size - code_blocks[i].length + 50 <= 2000) {
                break
            }
            size -= code_blocks[i].length - 50
        }

        for (let i = clip_code_blocks_count - 1; i >= 0; i--) {
            let raw_code_block = text.substring(code_blocks[i].start, code_blocks[i].start + code_blocks[i].length)
            let code_block = raw_code_block.trim().substring(raw_code_block.indexOf('\n'), raw_code_block.length - 3).trim()

            //let url = await hastebin.createPaste(code_block, {
            //    raw: true,
            //    contentType: 'text/plain' as any,
            //    server: 'https://hastebin.com'
            //})

            const response = await fetch('https://hastebin.com/documents', {
                method: 'POST',
                headers: {
                    'content-type': 'text/plain',
                    'Authorization': `Bearer ${login.hastebin_key}`
                },
                body: code_block
            })

            if (response.ok) {
                const key = (await response.json()).key
                text = text.replace(raw_code_block, `https://hastebin.com/share/${key}`)
                hastebins[key] = code_block
            } else {
                throw response
            }
        }

        if (text.length <= 2000) {
            return {
                parts: [text],
                hastebins: hastebins
            }
        } else {
            let blocks = []

            let block_start = 0
            let block_end = 0
            let code_start = undefined
            let last_line_end = -1
            while (true) {
                let line_end = text.indexOf('\n', last_line_end + 1)

                if (line_end < 0) {
                    let end = !!code_start ? code_start : block_end
                    let block = text.substring(block_start, end).trim()
                    if (block.length > 0) {
                        blocks.push(block)
                    }
                    break
                }

                let length = line_end - last_line_end
                let line = text.substring(last_line_end, line_end).trim()
                if (line.startsWith('```')) {
                    if (!code_start) {
                        code_start = last_line_end
                    } else {
                        code_start = undefined
                    }
                }
                if (block_end - block_start + length > 2000) {
                    let end = !!code_start ? code_start : block_end
                    let block = text.substring(block_start, end).trim()
                    if (block.length > 0) {
                        blocks.push(block)
                    }
                    block_start = end
                    block_end = block_start
                    last_line_end = end
                    code_start = undefined
                } else {
                    block_end += length
                    last_line_end = line_end
                }
            }

            return {
                parts: blocks,
                hastebins: hastebins
            }
        }
    }
}

const _io: any = {
    colors: {
        Reset: '\x1b[0m',
        Bright: '\x1b[1m',
        Dim: '\x1b[2m',
        Underscore: '\x1b[4m',
        Blink: '\x1b[5m',
        Reverse: '\x1b[7m',
        Hidden: '\x1b[8m',

        FgBlack: '\x1b[30m',
        FgRed: '\x1b[31m',
        FgGreen: '\x1b[32m',
        FgYellow: '\x1b[33m',
        FgBlue: '\x1b[34m',
        FgMagenta: '\x1b[35m',
        FgCyan: '\x1b[36m',
        FgWhite: '\x1b[37m',
        FgGray: '\x1b[90m',

        BgBlack: '\x1b[40m',
        BgRed: '\x1b[41m',
        BgGreen: '\x1b[42m',
        BgYellow: '\x1b[43m',
        BgBlue: '\x1b[44m',
        BgMagenta: '\x1b[45m',
        BgCyan: '\x1b[46m',
        BgWhite: '\x1b[47m',
        BgGray: '\x1b[100m'
    }
}
_io.marks = {
    status: `${_io.colors.FgBlue}###${_io.colors.Reset}`,
    in: `${_io.colors.FgBlue}<<-${_io.colors.Reset}`,
    out: `${_io.colors.FgBlue}->>${_io.colors.Reset}`,
    query: `${_io.colors.FgBlue}???${_io.colors.Reset}`,
    event: `${_io.colors.FgBlue}$$$${_io.colors.Reset}`
}
export const io = _io
