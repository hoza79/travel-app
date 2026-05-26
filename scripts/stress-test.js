const axios = require("axios");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const path = require("path");
const { performance } = require("perf_hooks");
const { io } = require("socket.io-client");

require("dotenv").config({
  path: path.join(__dirname, "../backend/.env"),
  quiet: true,
});

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const SOCKET_URL = process.env.SOCKET_URL || BASE_URL;
const MAX_CLIENTS = Number(process.env.MAX_CLIENTS || 10000);
const RUNS = Number(process.env.RUNS || 10);
const CONNECT_TIMEOUT_MS = Number(process.env.CONNECT_TIMEOUT_MS || 120000);
const EVENT_TIMEOUT_MS = Number(process.env.EVENT_TIMEOUT_MS || 60000);
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET_KEY) {
  console.error("JWT_SECRET_KEY saknas i backend/.env");
  process.exit(1);
}

if (!Number.isInteger(MAX_CLIENTS) || MAX_CLIENTS < 1) {
  console.error("MAX_CLIENTS måste vara ett heltal större än 0");
  process.exit(1);
}

if (!Number.isInteger(RUNS) || RUNS < 1) {
  console.error("RUNS måste vara ett heltal större än 0");
  process.exit(1);
}

async function connectDb() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createJwt(payload) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + 24 * 60 * 60,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedBody = base64Url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;

  const signature = crypto
    .createHmac("sha256", JWT_SECRET_KEY)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${signature}`;
}

async function upsertUser(connection) {
  await connection.query(
    `
    INSERT INTO users (first_name, last_name, email, password_hash)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      first_name = VALUES(first_name),
      last_name = VALUES(last_name)
    `,
    ["SocketOwner", "Test", "socket-owner@catchme.test", "socket-test-hash"],
  );

  const [[user]] = await connection.query(
    `
    SELECT id, first_name, last_name, email
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    ["socket-owner@catchme.test"],
  );

  return user;
}

async function cleanupPreviousSocketTest(connection) {
  const [testTrips] = await connection.query(
    `
    SELECT id
    FROM trips
    WHERE origin = 'Socket Test Origin'
       OR destination = 'Socket Test Destination'
    `,
  );

  const tripIds = testTrips.map((trip) => trip.id);

  if (tripIds.length === 0) {
    return;
  }

  await connection.query("DELETE FROM notifications WHERE trip_id IN (?)", [
    tripIds,
  ]);

  await connection.query("DELETE FROM trip_participants WHERE trip_id IN (?)", [
    tripIds,
  ]);

  await connection.query("DELETE FROM interest_requests WHERE trip_id IN (?)", [
    tripIds,
  ]);

  await connection.query("DELETE FROM trips WHERE id IN (?)", [tripIds]);
}

async function createTrip(connection, ownerId) {
  const [result] = await connection.query(
    `
    INSERT INTO trips
    (
      creator_id,
      origin,
      destination,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      trip_date,
      available_seats,
      description,
      type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      ownerId,
      "Socket Test Origin",
      "Socket Test Destination",
      59.3293,
      18.0686,
      59.8586,
      17.6389,
      "2026-06-01",
      1,
      "Synthetic Socket.IO broadcast test trip",
      "Offering",
    ],
  );

  return result.insertId;
}

function connectClients(clients) {
  return new Promise((resolve, reject) => {
    let connectedCount = 0;
    let finished = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(
          new Error(
            `Timeout: ${connectedCount}/${MAX_CLIENTS} klienter anslöt`,
          ),
        );
      }
    }, CONNECT_TIMEOUT_MS);

    for (let i = 0; i < MAX_CLIENTS; i++) {
      const socket = io(SOCKET_URL, {
        transports: ["websocket"],
        reconnection: false,
      });

      clients.push(socket);

      socket.once("connect", () => {
        connectedCount++;

        if (connectedCount === MAX_CLIENTS && !finished) {
          finished = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      socket.once("connect_error", (error) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          reject(error);
        }
      });
    }
  });
}

function monitorTripDeletion(clients, tripId) {
  let cancel;

  const promise = new Promise((resolve, reject) => {
    let receivedCount = 0;
    let startTime = 0;
    let finished = false;
    const handlers = [];

    const cleanup = () => {
      for (const { socket, handler } of handlers) {
        socket.off("trip_deleted", handler);
      }
    };

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        reject(
          new Error(
            `Timeout: ${receivedCount}/${MAX_CLIENTS} klienter tog emot eventet`,
          ),
        );
      }
    }, EVENT_TIMEOUT_MS);

    cancel = (error) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        cleanup();
        reject(error);
      }
    };

    for (const socket of clients) {
      const handler = (payload) => {
        if (Number(payload?.tripId) !== Number(tripId)) {
          return;
        }

        socket.off("trip_deleted", handler);
        receivedCount++;

        if (receivedCount === 1) {
          startTime = performance.now();
        }

        if (receivedCount === MAX_CLIENTS && !finished) {
          finished = true;
          clearTimeout(timeout);
          cleanup();

          resolve({
            receivedCount,
            duration: performance.now() - startTime,
          });
        }
      };

      handlers.push({ socket, handler });
      socket.on("trip_deleted", handler);
    }
  });

  return {
    promise,
    cancel: (error) => cancel(error),
  };
}

async function runMeasurement(connection, ownerId, ownerToken, clients) {
  const tripId = await createTrip(connection, ownerId);
  const monitor = monitorTripDeletion(clients, tripId);

  try {
    await axios.delete(`${BASE_URL}/post/${tripId}`, {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    return await monitor.promise;
  } catch (error) {
    monitor.cancel(error);

    try {
      await monitor.promise;
    } catch {}

    throw error;
  }
}

function closeClients(clients) {
  for (const client of clients) {
    try {
      client.disconnect();
    } catch {}
  }
}

async function run() {
  const connection = await connectDb();
  const clients = [];
  const durations = [];

  try {
    await cleanupPreviousSocketTest(connection);

    const owner = await upsertUser(connection);
    const ownerToken = createJwt({
      id: owner.id,
      email: owner.email,
      first_name: owner.first_name,
      last_name: owner.last_name,
    });

    await connectClients(clients);

    for (let runNumber = 0; runNumber < RUNS; runNumber++) {
      const result = await runMeasurement(
        connection,
        owner.id,
        ownerToken,
        clients,
      );

      if (result.receivedCount !== MAX_CLIENTS) {
        throw new Error(
          `Körning ${runNumber + 1}: endast ${result.receivedCount}/${MAX_CLIENTS} event mottogs`,
        );
      }

      durations.push(result.duration);
    }

    const lowest = Math.min(...durations);
    const highest = Math.max(...durations);
    const average =
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length;

    console.log("Test av Socket.IO-baserad uppdatering");
    console.log("Händelse: trip_deleted");
    console.log(`Antal klienter: ${MAX_CLIENTS}`);
    console.log(`Antal körningar: ${RUNS}`);
    console.log(`Mottagna event per körning: ${MAX_CLIENTS}/${MAX_CLIENTS}`);
    console.log(
      `Tider: ${durations.map((duration) => duration.toFixed(2)).join(", ")} ms`,
    );
    console.log(`Lägsta tid: ${lowest.toFixed(2)} ms`);
    console.log(`Högsta tid: ${highest.toFixed(2)} ms`);
    console.log(`Medelvärde: ${average.toFixed(2)} ms`);
    console.log("Resultat: Godkänt");
  } finally {
    closeClients(clients);
    await cleanupPreviousSocketTest(connection);
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
