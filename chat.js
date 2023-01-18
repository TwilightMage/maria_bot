import { ChatGPTAPIBrowser, browserPostEventStream } from 'chatgpt'
import login from "./login.json" assert { type: "json" };
import * as utils from "./utils.js";

const api = new ChatGPTAPIBrowser({
    email: login.chat_auth.login,
    password: login.chat_auth.password,
    isGoogleLogin: true
})
await api.initSession()
console.log(`${utils.io.marks.status} Chat GPT ready!`)

export async function message(text, options) {
    let response = await api.sendMessage(text, options)

    return {
        text: response.response,
        conversationId: response.conversationId,
        messageId: response.messageId
    }
}

export async function setConversationName(conversationId, newName) {
    await api._page.evaluate(
        async (url, token, body, timeout_ms) => {
            const res = await fetch(url, {
                method: "PATCH",
                body: JSON.stringify(body),
                signal: void 0,
                headers: {
                    accept: "*/*",
                    authorization: `Bearer ${token}`,
                    "content-type": "application/json"
                }
            });
        },
        `https://chat.openai.com/backend-api/conversation/${conversationId}`,
        api._accessToken,
        {title: newName},
        null
    )
}

export async function remove(conversationId) {
    await api._page.evaluate(
        async (url, token, body, timeout_ms) => {
            const res = await fetch(url, {
                method: "PATCH",
                body: JSON.stringify(body),
                signal: void 0,
                headers: {
                    accept: "*/*",
                    authorization: `Bearer ${token}`,
                    "content-type": "application/json"
                }
            });
        },
        `https://chat.openai.com/backend-api/conversation/${conversationId}`,
        api._accessToken,
        {is_visible: false},
        null
    )
}