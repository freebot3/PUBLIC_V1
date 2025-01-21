// Owner: Wily Kun
// Recode: Wily Kun
// -------------------------------------------------------------------------
const { default: WAConnect } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { getSettings } = require('./settings'); // Import settings
const EventEmitter = require('events');

const settings = getSettings();
EventEmitter.defaultMaxListeners = 20; // Increase max listeners limit

async function startAutoTyping(client, chatId, isGroup) {
  const autoTypingEnabled = isGroup ? settings.autoTyping.group : settings.autoTyping.private;
  if (!autoTypingEnabled) return;

  const duration = settings.autoTyping.duration || 60000; // Default to 1 minute

  const sendTyping = async () => {
    try {
      await client.sendPresenceUpdate('composing', chatId);
    } catch (error) {
      console.error('Error in auto typing:', error);
    }
  };

  setInterval(async () => {
    if (client.ws.readyState === 1) { // Check if connection is open
      await sendTyping();
    }
  }, duration);

  client.ev.off('messages.upsert', sendTyping); // Remove existing listener
  client.ev.on('messages.upsert', async (chatUpdate) => {
    const m = chatUpdate.messages[0];
    if (m.key.remoteJid === chatId && !m.key.fromMe) {
      await sendTyping();
    }
  });

  client.ev.off('connection.update', sendTyping); // Remove existing listener
  client.ev.on('connection.update', async (update) => {
    if (update.connection === 'open') {
      await sendTyping();
    }
  });
}

async function startAutoRecording(client, chatId, isGroup) {
  const autoRecordingEnabled = isGroup ? settings.autoRecording.group : settings.autoRecording.private;
  if (!autoRecordingEnabled) return;

  const duration = settings.autoRecording.duration || 60000; // Default to 1 minute

  const sendRecording = async () => {
    try {
      await client.sendPresenceUpdate('recording', chatId);
    } catch (error) {
      console.error('Error in auto recording:', error);
    }
  };

  setInterval(async () => {
    if (client.ws.readyState === 1) { // Check if connection is open
      await sendRecording();
    }
  }, duration);

  client.ev.off('messages.upsert', sendRecording); // Remove existing listener
  client.ev.on('messages.upsert', async (chatUpdate) => {
    const m = chatUpdate.messages[0];
    if (m.key.remoteJid === chatId && !m.key.fromMe) {
      await sendRecording();
    }
  });

  client.ev.off('connection.update', sendRecording); // Remove existing listener
  client.ev.on('connection.update', async (update) => {
    if (update.connection === 'open') {
      await sendRecording();
    }
  });
}

module.exports = {
  startAutoTyping,
  startAutoRecording
};
