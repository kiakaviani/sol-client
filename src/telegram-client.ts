import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from "telegram/events";

export function listenToChannel(apiId:number, apiHash: string, chatId: number) {
    const session = new StringSession('');
    const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
    // to get the chatId:
    // option 1: open telegram on a web browser, go to the chat, and look the url in the address bar
    // option 2: open telegram app, copy link to any message, it should be something like: https://t.me/c/1234567890/12345, the first number after "/c/" is the chatId
    client.addEventHandler(eventPrint, new NewMessage({ chats: [chatId] }));
}

async function eventPrint(event:any) {
    // see 'node_modules/telegram/tl/custom/message.d.ts'
    const message = event.message
    const isNew = message.editDate === undefined
    const text = message.text
    const date = new Date(message.date*1000)

    console.log(`The message is ${isNew ? 'new' : 'an update'}`)
    console.log(`The text is: ${text}`)
    console.log(`The date is: ${date}`)
}