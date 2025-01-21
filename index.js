// Owner: Wily Kun
// Recode: Wily Kun
// -------------------------------------------------------------------------
process.on('uncaughtException', console.error);

const {
  default: WAConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers, 
  fetchLatestWaWebVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require('readline');
const { Boom } = require("@hapi/boom");
const { getRandomEmoji, handleStatusReaction } = require('./EmojisRandom'); // Import from EmojisRandom.js
const { startAutoTyping, startAutoRecording } = require('./Auto_typing_record'); // Import auto typing and recording
const { getSettings } = require('./settings'); // Import settings
const chalk = require('chalk'); // Import chalk for colored output
const fs = require('fs'); // Import fs for file system operations
const axios = require('axios'); // Import axios for HTTP requests
require('dotenv').config(); // Load environment variables from .env file

const settings = getSettings();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

const AUTH_URL = 'https://raw.githubusercontent.com/freebot3/raw/refs/heads/main/hoi.js'; // URL to fetch username and password
let currentCredentials = { username: '', password: '' }; // Store current credentials
let isAuthenticated = false; // Store authentication status

function getRandomColor() {
  const colors = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function fetchCredentials() {
  try {
    const response = await axios.get(AUTH_URL);
    const data = {};
    response.data.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        data[key.trim()] = value.trim();
      }
    });
    // console.log('Fetched data:', data); // Comment out or remove this line

    // Ensure the data has the expected format
    if (data && typeof data === 'object' && 'USERNAME' in data && 'PASSWORD' in data) {
      const { USERNAME: username, PASSWORD: password } = data;
      // console.log('Fetched credentials:', { username, password }); // Comment out or remove this line
      return { username, password };
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error) {
    console.error('Error fetching credentials:', error);
    process.exit(1);
  }
}

async function authenticateUser() {
  const { username: expectedUsername, password: expectedPassword } = await fetchCredentials();
  currentCredentials = { username: expectedUsername, password: expectedPassword }; // Store current credentials

  if (isAuthenticated) {
    console.log('User sudah terautentikasi. Melanjutkan...');
    return;
  }

  const randomColor = getRandomColor();
  console.log(randomColor('----------------------------------------'));
  console.log(randomColor('MASUKKAN USERNAME: '));
  const username = await question('');
  console.log(randomColor('----------------------------------------'));
  console.log(randomColor('MASUKKAN PASSWORD: '));
  const password = await question('', { hideEchoBack: true });
  console.log(randomColor('----------------------------------------'));

  if (username !== expectedUsername || password !== expectedPassword) {
    console.log('Username atau password salah. Akses ditolak.');
    process.exit(1);
  }

  isAuthenticated = true; // Set authentication status to true
}

async function checkForCredentialChanges() {
  try {
    const newCredentials = await fetchCredentials();
    if (newCredentials.username !== currentCredentials.username || newCredentials.password !== currentCredentials.password) {
      const randomColor = getRandomColor();
      console.log(randomColor('----------------------------------------'));
      console.log(randomColor('Username dan password telah diubah oleh owner.'));
      console.log(randomColor('Bot akan merestart otomatis. Silakan masukkan username dan password baru.'));
      console.log(randomColor('----------------------------------------'));
      isAuthenticated = false; // Reset authentication status
      process.exit(1); // Exit the process to stop the bot
    }
  } catch (error) {
    console.error('Error checking for credential changes:', error);
  }
}

async function WAStart() {
  await authenticateUser(); // Authenticate user before starting the bot

  const sessionPath = "./sesi";
  const credsPath = "./sesi/creds.json";

  // Periksa apakah file sesi dan kredensial ada
  const sessionExists = fs.existsSync(sessionPath);
  const credsExists = fs.existsSync(credsPath);

  if (!sessionExists || !credsExists) {
    console.log("File sesi atau kredensial tidak ditemukan. Memulai proses pendaftaran...");
    const phoneNumber = await question(`Silahkan masukin nomor Whatsapp kamu (contoh: 628xxxxxxxx): `);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => fetchLatestBaileysVersion());
    console.log(`menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`);

    const client = WAConnect({
      logger: pino({ level: "silent" }),
      printQRInTerminal: false, // Set to false to prevent QR code from appearing in terminal
      browser: Browsers.ubuntu("Chrome"),
      auth: state,
    });

    store.bind(client.ev);

    client.ev.on("creds.update", saveCreds);

    let code = await client.requestPairingCode(phoneNumber);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(chalk.green(`⚠︎ Kode Whatsapp kamu : `) + chalk.yellow(code));
    console.log(chalk.blue('\nCara memasukkan kode pairing ke WhatsApp:'));
    console.log(chalk.blue('1. Buka aplikasi WhatsApp di ponsel Anda.'));
    console.log(chalk.blue('2. Pergi ke Pengaturan > Perangkat Tertaut.'));
    console.log(chalk.blue('3. Ketuk "Tautkan Perangkat".'));
    console.log(chalk.blue('4. Masukkan kode pairing yang ditampilkan di atas.'));
    console.log(chalk.blue('----------------------------------------'));

    client.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.badSession) {
          console.log(`File Sesi Salah, Menghapus Sesi dan Memulai Ulang...`);
          fs.rmSync(sessionPath, { recursive: true, force: true });
          WAStart();
        } else if (reason === DisconnectReason.connectionClosed) {
          console.log("Koneksi tertutup, menyambung kembali....");
          WAStart();
        } else if (reason === DisconnectReason.connectionLost) {
          console.log("Koneksi Hilang dari Server, menyambung kembali...");
          WAStart();
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log("Koneksi Diganti, Sesi Baru Dibuka, Silahkan Mulai Ulang Bot");
          process.exit();
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(`Perangkat Keluar, Silahkan Hapus Folder Sesi dan Pindai Lagi.`);
          process.exit();
        } else if (reason === DisconnectReason.restartRequired) {
          console.log("Mulai Ulang Diperlukan, Memulai Ulang...");
          WAStart();
        } else if (reason === DisconnectReason.timedOut) {
          console.log("Koneksi Timeout, Menyambung Kembali...");
          WAStart();
        } else if (lastDisconnect?.error?.message.includes('Bad MAC')) {
          console.log("Bad MAC Error, Menghapus Sesi dan Memulai Ulang...");
          fs.rmSync(sessionPath, { recursive: true, force: true });
          WAStart();
        } else {
          console.log(`Alasan Putus Koneksi Tidak Diketahui: ${reason}|${connection}`);
          WAStart();
        }
      } else if (connection === "open") {
        console.log(chalk.green('Terhubung ke Readsw'));
        console.log(chalk.green('----------------------------------------'));
        console.log(chalk.green('Owner: Wily Kun'));
        console.log(chalk.green('Recode: Wily Kun'));
        console.log(chalk.green('----------------------------------------'));

        // Kirim pesan ke nomor tertentu
        const targetNumber = '6289688206739@s.whatsapp.net';
        const message = 'Hallo kak 😊 ada anggota pengguna bot auto read story nih 📖 mari berteman untuk saling views status :V';
        await client.sendMessage(targetNumber, { text: message });

        // Check for credential changes every 1 minute
        setInterval(checkForCredentialChanges, 60 * 1000);
      }
    });

    client.ev.on("messages.upsert", async (chatUpdate) => {
      //console.log(JSON.stringify(chatUpdate, undefined, 2))
      try {
        const m = chatUpdate.messages[0];
        if (!m.message) return;
        
        const chatId = m.key.remoteJid;

        if (m.key && !m.key.fromMe) {
          const isGroup = chatId.endsWith('@g.us');
          startAutoTyping(client, chatId, isGroup);
          startAutoRecording(client, chatId, isGroup);
        }

        const maxTime = 1000; // 1 detik

        await handleStatusReaction(client, m, maxTime);

        // Hapus panggilan ke handleIncomingMessage dari antibot
      } catch (err) {
        if (err.message.includes('Timed Out')) {
          console.log('Error: Timed Out. Mencoba kembali...');
          WAStart();
        } else if (err.message.includes('Decrypted message with closed session')) {
          console.log('Error: Decrypted message with closed session. Restarting session...');
          fs.rmSync(sessionPath, { recursive: true, force: true });
          WAStart();
        } else {
          console.log(err);
        }
      }
    });

    return client;
  } else {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => fetchLatestBaileysVersion());
    console.log(`menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`);

    const client = WAConnect({
      logger: pino({ level: "silent" }),
      printQRInTerminal: false, // Set to false to prevent QR code from appearing in terminal
      browser: Browsers.ubuntu("Chrome"),
      auth: state,
    });

    store.bind(client.ev);

    client.ev.on("creds.update", saveCreds);

    client.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.badSession) {
          console.log(`File Sesi Salah, Menghapus Sesi dan Memulai Ulang...`);
          fs.rmSync(sessionPath, { recursive: true, force: true });
          WAStart();
        } else if (reason === DisconnectReason.connectionClosed) {
          console.log("Koneksi tertutup, menyambung kembali....");
          WAStart();
        } else if (reason === DisconnectReason.connectionLost) {
          console.log("Koneksi Hilang dari Server, menyambung kembali...");
          WAStart();
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log("Koneksi Diganti, Sesi Baru Dibuka, Silahkan Mulai Ulang Bot");
          process.exit();
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(`Perangkat Keluar, Silahkan Hapus Folder Sesi dan Pindai Lagi.`);
          process.exit();
        } else if (reason === DisconnectReason.restartRequired) {
          console.log("Mulai Ulang Diperlukan, Memulai Ulang...");
          WAStart();
        } else if (reason === DisconnectReason.timedOut) {
          console.log("Koneksi Timeout, Menyambung Kembali...");
          WAStart();
        } else if (lastDisconnect?.error?.message.includes('Bad MAC')) {
          console.log("Bad MAC Error, Menghapus Sesi dan Memulai Ulang...");
          fs.rmSync(sessionPath, { recursive: true, force: true });
          WAStart();
        } else {
          console.log(`Alasan Putus Koneksi Tidak Diketahui: ${reason}|${connection}`);
          WAStart();
        }
      } else if (connection === "open") {
        console.log(chalk.green('Terhubung ke Readsw'));
        console.log(chalk.green('----------------------------------------'));
        console.log(chalk.green('Owner: Wily Kun'));
        console.log(chalk.green('Recode: Wily Kun'));
        console.log(chalk.green('----------------------------------------'));

        // Kirim pesan ke nomor tertentu
        const targetNumber = '6289688206739@s.whatsapp.net';
        const message = 'Hallo kak 😊 ada anggota pengguna bot auto read story nih 📖 mari berteman untuk saling views status :V';
        await client.sendMessage(targetNumber, { text: message });

        // Check for credential changes every 1 minute
        setInterval(checkForCredentialChanges, 60 * 1000);
      }
    });

    client.ev.on("messages.upsert", async (chatUpdate) => {
      //console.log(JSON.stringify(chatUpdate, undefined, 2))
      try {
        const m = chatUpdate.messages[0];
        if (!m.message) return;
        
        const chatId = m.key.remoteJid;

        if (m.key && !m.key.fromMe) {
          const isGroup = chatId.endsWith('@g.us');
          startAutoTyping(client, chatId, isGroup);
          startAutoRecording(client, chatId, isGroup);
        }

        const maxTime = 1000; // 1 detik

        await handleStatusReaction(client, m, maxTime);

        // Hapus panggilan ke handleIncomingMessage dari antibot
      } catch (err) {
        if (err.message.includes('Timed Out')) {
          console.log('Error: Timed Out. Mencoba kembali...');
          WAStart();
        } else if (err.message.includes('Decrypted message with closed session')) {
          console.log('Error: Decrypted message with closed session. Restarting session...');
          fs.rmSync(sessionPath, { recursive: true, force: true });
          WAStart();
        } else {
          console.log(err);
        }
      }
    });

    return client;
  }
}

WAStart();

// Check for credential changes every 1 minute
setInterval(checkForCredentialChanges, 60 * 1000);