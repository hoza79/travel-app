const axios = require("axios");
const mysql = require("mysql2/promise");
const path = require("path");
const { performance } = require("perf_hooks");

require("dotenv").config({
  path: path.join(__dirname, "../backend/.env"),
  quiet: true,
});

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const TRIP_COUNT = Number(process.env.TRIP_COUNT || 10000);
const RUNS = Number(process.env.RUNS || 10);
const TEST_USER_ID = Number(process.env.TEST_USER_ID || 1);
const CONFIRM_RESET = process.env.CONFIRM_RESET === "true";

if (!CONFIRM_RESET) {
  console.error("CONFIRM_RESET=true kravs eftersom testet rensar trips-data.");
  process.exit(1);
}

async function connectDb() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });
}

async function resetTrips(connection) {
  await connection.query("DELETE FROM notifications");
  await connection.query("DELETE FROM trip_participants");
  await connection.query("DELETE FROM interest_requests");
  await connection.query("DELETE FROM trips");
}

function createTripRow(i) {
  const originLat = 55 + ((i * 13) % 14000) / 1000;
  const originLng = 11 + ((i * 17) % 13000) / 1000;
  const destinationLat = 55 + ((i * 19) % 14000) / 1000;
  const destinationLng = 11 + ((i * 23) % 13000) / 1000;
  const day = String((i % 28) + 1).padStart(2, "0");

  return [
    TEST_USER_ID,
    `FF1 Test Origin ${i}`,
    `FF1 Test Destination ${i}`,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    `2026-06-${day}`,
    (i % 4) + 1,
    `Synthetic FF1 trip ${i}`,
    i % 2 === 0 ? "Offering" : "Searching",
  ];
}

async function seedTrips(connection) {
  const batchSize = 1000;

  for (let start = 0; start < TRIP_COUNT; start += batchSize) {
    const rows = [];

    for (let i = start; i < Math.min(start + batchSize, TRIP_COUNT); i++) {
      rows.push(createTripRow(i));
    }

    await connection.query(
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
      VALUES ?
      `,
      [rows],
    );
  }
}

async function countTrips(connection) {
  const [[row]] = await connection.query("SELECT COUNT(*) AS count FROM trips");
  return Number(row.count || 0);
}

async function measureNearbyRequest() {
  const start = performance.now();

  await axios.get(`${BASE_URL}/post/nearby`, {
    params: {
      lat: 59.3293,
      lng: 18.0686,
      offset: 0,
      limit: 50,
    },
  });

  const end = performance.now();
  return end - start;
}

function summarize(times) {
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = times.reduce((sum, value) => sum + value, 0) / times.length;

  return {
    min: min.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2),
  };
}

async function run() {
  const connection = await connectDb();

  try {
    await resetTrips(connection);
    await seedTrips(connection);

    const totalTrips = await countTrips(connection);
    const times = [];

    for (let i = 0; i < RUNS; i++) {
      const time = await measureNearbyRequest();
      times.push(time);
    }

    const result = summarize(times);

    console.log("Test av positionsbaserad sortering");
    console.log(`Antal resor: ${totalTrips}`);
    console.log(`Antal körningar: ${RUNS}`);
    console.log(`Svarstider: ${times.map((t) => t.toFixed(2)).join(", ")} ms`);
    console.log(`Lägsta svarstid: ${result.min} ms`);
    console.log(`Högsta svarstid: ${result.max} ms`);
    console.log(`Medelvärde: ${result.avg} ms`);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
