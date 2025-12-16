/**
 * Telegram Bot для запуска Mini App
 */

const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:3000';

if (!token) {
    console.error('ERROR: BOT_TOKEN is not set in .env file');
    process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(token, { polling: true });

console.log('');
console.log('================================');
console.log('Telegram Bot started');
console.log('WebApp URL:', webAppUrl);
console.log('Waiting for commands...');
console.log('================================');
console.log('');

// Command /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'friend';

    const welcomeMessage = `
Hello ${firstName}!

Welcome to <b>Betting AI</b>

I will help you generate random predictions for sports events!

<b>How it works:</b>
1. Upload a screenshot of an event
2. Click "Analyze"
3. Get a smart prediction

<b>Warning!</b> This is an entertainment app. Predictions are generated randomly. Do not use for real betting!

Click the button below to start
    `.trim();

    bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'HTML',
        reply_markup: {
            keyboard: [
                [{
                    text: 'Open App',
                    web_app: { url: webAppUrl }
                }],
                [{
                    text: 'Help'
                }, {
                    text: 'About'
                }]
            ],
            resize_keyboard: true
        }
    });
});

// Command /help
bot.onText(/\/help|Help/, (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
<b>Help</b>

<b>Commands:</b>
/start - Start bot
/help - Show this help
/about - About project
/quick - Quick prediction without image

<b>How to use Mini App:</b>
1. Click "Open App"
2. Upload screenshot of match
3. Or paste screenshot (Ctrl+V)
4. Click "Analyze"
5. Get random prediction

<b>Supported formats:</b>
JPEG, PNG, GIF, WebP
Max size: 10 MB

<b>Important!</b>
This is entertainment project
Predictions are random
Do not use for real betting
    `.trim();

    bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
});

// Command /about
bot.onText(/\/about|About/, (msg) => {
    const chatId = msg.chat.id;

    const aboutMessage = `
<b>About "Betting AI"</b>

This is entertainment Telegram Mini App for generating random predictions for sports events.

<b>Technologies:</b>
• Node.js + Express
• Telegram Bot API
• Telegram Mini Apps
• Multer (file uploads)

<b>Features:</b>
Image uploads
Event analysis
Random predictions
Beautiful interface

<b>Disclaimer:</b>
This app is created for entertainment purposes only. All predictions are generated randomly and have no relation to real analysis. Do not use it for making real betting decisions!

<b>Developer:</b>
Made with love for fun

Version: 1.0.0
    `.trim();

    bot.sendMessage(chatId, aboutMessage, { parse_mode: 'HTML' });
});

// Command /quick - quick prediction
bot.onText(/\/quick/, async (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Generating prediction...');

    try {
        const generator = require('./utils/generator');
        const prediction = generator.generate();

        const predictionMessage = `
${prediction.emoji} <b>Quick Prediction</b>

<b>Bet:</b> ${prediction.betType}

<b>Reason:</b>
${prediction.reason}

<b>Probability:</b> ${prediction.probability}%
<b>Confidence:</b> ${prediction.confidence}/10

<b>Analysis:</b>
${prediction.analysis}

Prediction generated randomly!
        `.trim();

        bot.sendMessage(chatId, predictionMessage, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('Generation error:', error);
        bot.sendMessage(chatId, 'Error generating prediction');
    }
});

// Handle text messages
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore commands
    if (text && text.startsWith('/')) return;

    // Ignore menu buttons
    if (text === 'Open App' || text === 'Help' || text === 'About') return;

    // Response to other messages
    bot.sendMessage(chatId, 
        'Command not recognized. Click /help for help or use menu buttons.',
        {
            reply_markup: {
                keyboard: [
                    [{
                        text: 'Open App',
                        web_app: { url: webAppUrl }
                    }],
                    [{
                        text: 'Help'
                    }, {
                        text: 'About'
                    }]
                ],
                resize_keyboard: true
            }
        }
    );
});

// Handle polling errors
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code);
    if (error.response) {
        console.error('Response:', error.response.body);
    }
});

// Handle general errors
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping bot...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, stopping bot...');
    bot.stopPolling();
    process.exit(0);
});