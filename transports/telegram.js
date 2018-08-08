'use strict';

const async = require('async');

const request = require('request');
const winston = require('winston');

class Telegram extends winston.Transport {

    constructor(options) {
        if(Object(options) !== options) {
            throw new Error('Options are required');
        }

        if(typeof(options.token) !== 'string') {
            throw new Error('Telegram token is required');
        }

        // вызываем конструктор родителя
        super(options);

        // добавляем токен
        this.token = options.token;

        // добавляем список чатов
        this.chats = options.chats;
    }

    log(info, callback = () => {}) {
        // получаем отформатированное сообщение
        let message = info[Symbol.for('message')];

        // отправляем сообщение по всем указанным чатам
        sendMessageMulti(this.token, this.chats, message, callback);
    }

}

// добавляем этот transport в модуль winstons чтобы он был виден глобально
winston.transports.Telegram = Telegram;

// записываем название даннго transport в прототипе
Telegram.prototype.name = 'telegram';

function sendMessageMulti(token, chats, message, callback) {
    // если не было указано ни одного чата, не отправляем сообщение
    if(!chats) return callback();

    if(!Array.isArray(chats)) {
        chats = [chats];
    }
    else if(!chats.length) {
        // если массив пустой, тоже не отправляем сообщение
        return callback();
    }

    let tasks = [];

    for(let i = 0, l = chats.length; i < l; i++) {
        tasks.push( async.apply(sendMessage, token, chats[i], message) );
    }

    async.parallel(tasks, callback);
}

function sendMessage(token, chatid, message, callback) {
    if(typeof(chatid) !== 'number' && typeof(chatid) !== 'string') {
        return callback(new Error('Invalid chat id'));
    }

    if(typeof(message) !== 'number' && typeof(message) !== 'string') {
        return callback(new Error('Invalid message'));
    }

    request({
        uri: 'https://api.telegram.org/bot' + token + '/sendMessage',
        method: 'POST',
        body: {
            chat_id: chatid,
            text: message,
            disable_notification: false
        },
        timeout: 60000,
        json: true
    }, function(err, res, data) {
        if(err) return callback(err);

        if(Object(data) !== data) {
            return callback(new Error('Invalid response'));
        }

        if(!data.ok) {
            return callback(new Error(data.description || 'Unknown error'));
        }

        callback();
    });
}

module.exports = Telegram;