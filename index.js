'use strict';

const winston = require('winston');

const GLOBAL_OPTIONS = {};

const LOGGER_LEVELS = {
    emerg: 0,
    error: 1,
    warning: 2,
    info: 3,
    debug: 4
};

const LOGGER_MSG_TEMPLATE = winston.format.printf(info => {
    let ts = info.timestamp ? info.timestamp.slice(0, 19).replace('T', ' ') + ' ' : '',
        lb = info.label ? '[' + info.label + '] ' : '';

    return ts + lb + info.level + ': ' + info.message;
});

// запрашиваем класс transport Telegram
require('./transports/telegram');

// запрашиваем класс transport DailyRotateFile
require('winston-daily-rotate-file');

winston.config.addColors({
    emerg: 'red',
    error: 'red',
    warning: 'yellow',
    info: 'green',
    debug: 'gray'
});

function createLogger(options) {
    options = prepareOptions(options);

    let logger = winston.createLogger(options);

    // слушаем ошибки логгера чтобы игнорировать exit в случае ошибки
    logger.on('error', () => {});

    return logger;
}

function prepareOptions(options) {
    if(!options) options = {};

    assignGlobalOptions(options.global);

    let format,
        dirname = './logs',
        transports = [],
        exitOnError = true;

    // устанавливаем format
    if(typeof(options.label) !== 'undefined') {
        format = winston.format.combine(
            winston.format.json(),
            winston.format.timestamp(),
            winston.format.label({label: options.label})
        );
    }
    else {
        format = winston.format.combine(
            winston.format.json(),
            winston.format.timestamp()
        );
    }

    // устанавливаем dirname
    if(typeof(GLOBAL_OPTIONS.dirname) !== 'undefined') {
        dirname = GLOBAL_OPTIONS.dirname;
    }

    // сообщения уровня emerg будут отправляться по телеграму
    if(GLOBAL_OPTIONS.telegram && typeof(GLOBAL_OPTIONS.telegram.token) !== 'undefined') {
        transports.push(new winston.transports.Telegram({
            token: GLOBAL_OPTIONS.telegram.token,
            chats: GLOBAL_OPTIONS.telegram.chats,
            level: 'emerg',
            format: LOGGER_MSG_TEMPLATE
        }));
    }

    // все сообщения уровня warning, error и emerg будут логироваться в файлах
    transports.push(new winston.transports.DailyRotateFile({
        dirname: dirname,
        filename: 'error.%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '10m',
        maxFiles: '30d',
        level: 'warning',
        format: LOGGER_MSG_TEMPLATE
    }));

    if(process.env.NODE_ENV !== 'production') {
        // все сообщения будут логироваться в консоль если приложение не работает в продакшене
        transports.push(new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.align(),
                LOGGER_MSG_TEMPLATE
            )
        }));
    }

    // устанавливаем exitOnError
    if(typeof(GLOBAL_OPTIONS.exitOnError) !== 'undefined') {
        exitOnError = GLOBAL_OPTIONS.exitOnError;
    }

    return {
        levels: LOGGER_LEVELS,
        format: format,
        transports: transports,
        exceptionHandlers: [
            new winston.transports.File({
                dirname: dirname,
                filename: 'exception.log'
            })
        ],
        exitOnError: exitOnError
    };
}

function assignGlobalOptions(options) {
    if(!options) return;

    // настройки телеграм
    if(options.telegram) {
        if(!GLOBAL_OPTIONS.telegram) GLOBAL_OPTIONS.telegram = {};

        if(typeof(options.telegram.token) !== 'undefined') {
            GLOBAL_OPTIONS.telegram.token = options.telegram.token;
        }

        if(typeof(options.telegram.chats) !== 'undefined') {
            GLOBAL_OPTIONS.telegram.chats = options.telegram.chats;
        }
    }

    if(typeof(options.dirname) !== 'undefined') {
        GLOBAL_OPTIONS.dirname = options.dirname;
    }

    if(typeof(options.exitOnError) !== 'undefined') {
        GLOBAL_OPTIONS.exitOnError = options.exitOnError;
    }
}

module.exports = createLogger;