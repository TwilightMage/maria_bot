import {URL} from "node:url"
import fs from "fs"
import axios from "axios";

var a = await axios.get('https://cdn.discordapp.com/attachments/973580137582981161/1150469129883635763/voice-message.ogg', {
    responseType: 'arraybuffer'
})
fs.writeFileSync('./tmp/test2.ogg', a.data, {encoding: "binary"})