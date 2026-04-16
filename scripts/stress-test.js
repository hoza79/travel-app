const { io } = require("socket.io-client");

const URL = "http://localhost:3000";
const MAX_CLIENTS = 10000;
const STEP = 100;

let clients = [];
let receivedCount = 0;
let startTime = 0;

console.log(
  `🚀 Startar stresstest: Ansluter ${MAX_CLIENTS} virtuella klienter...`,
);

function createClient() {
  const socket = io(URL, { transports: ["websocket"] });

  socket.on("connect", () => {
    clients.push(socket);
    if (clients.length % 1000 === 0) {
      console.log(`📡 Anslutna: ${clients.length}/${MAX_CLIENTS}`);
    }

    if (clients.length === MAX_CLIENTS) {
      console.log(
        "✅ Alla 10 000 klienter är nu anslutna och väntar på broadcast!",
      );
    }
  });

  socket.on("trip_deleted", () => {
    receivedCount++;
    if (receivedCount === 1) {
      startTime = Date.now();
    }
    if (receivedCount === MAX_CLIENTS) {
      const endTime = Date.now();
      console.log(`🏁 TEST SLUTFÖRT!`);
      console.log(
        `⏱️ Tid för att nå alla 10 000 klienter: ${endTime - startTime}ms`,
      );
      process.exit(0);
    }
  });

  if (clients.length < MAX_CLIENTS) {
    setTimeout(createClient, 10);
  }
}

createClient();
