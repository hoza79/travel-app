const mysql = require("mysql2/promise");
const path = require("path");
const { performance } = require("perf_hooks");

require("dotenv").config({
  path: path.join(__dirname, "../backend/.env"),
  quiet: true,
});

const TEST_PREFIX = "ROUTE_FILTER_COMPARISON_TEST_";
const DATASET_SIZES = String(process.env.DATASET_SIZES || "10000,50000")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0);
const RUNS = Number(process.env.RUNS || 10);
const LIMIT = Number(process.env.LIMIT || 50);
const PICKUP_RADIUS_KM = Number(process.env.PICKUP_RADIUS_KM || 0.5);
const DESTINATION_RADIUS_KM = Number(process.env.DESTINATION_RADIUS_KM || 0.5);
const REQUESTED_ORIGIN = { lat: 62.3921, lng: 17.3069 };
const REQUESTED_DESTINATION = { lat: 63.1771, lng: 14.6362 };

if (DATASET_SIZES.length === 0 || !Number.isInteger(RUNS) || RUNS < 1) {
  console.error("DATASET_SIZES och RUNS maste innehalla positiva heltal.");
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

async function getFixtureOwnerId(connection) {
  const [[user]] = await connection.query(
    "SELECT id FROM users ORDER BY id ASC LIMIT 1",
  );

  if (!user) {
    throw new Error("Testet kraver minst en anvandare i users-tabellen.");
  }

  return user.id;
}

function offsetNorth(point, metres) {
  return {
    lat: point.lat + metres / 111320,
    lng: point.lng,
  };
}

function offsetEast(point, metres) {
  const metresPerDegree = 111320 * Math.cos((point.lat * Math.PI) / 180);
  return {
    lat: point.lat,
    lng: point.lng + metres / metresPerDegree,
  };
}

function createTripRow(ownerId, index) {
  const inside = index % 4 === 0;
  const pickupMetres = inside ? 25 + (index % 430) : 700 + (index % 2000);
  const destinationMetres = inside
    ? 30 + ((index * 3) % 420)
    : 700 + ((index * 5) % 2000);
  const origin = offsetNorth(REQUESTED_ORIGIN, pickupMetres);
  const destination = offsetEast(REQUESTED_DESTINATION, destinationMetres);

  return [
    ownerId,
    `${TEST_PREFIX}ORIGIN_${index}`,
    `${TEST_PREFIX}DESTINATION_${index}`,
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    `2026-06-${String((index % 28) + 1).padStart(2, "0")}`,
    (index % 4) + 1,
    `${TEST_PREFIX}${index}`,
    "Offering",
  ];
}

async function cleanupFixtures(connection) {
  await connection.query("DELETE FROM trips WHERE description LIKE ?", [
    `${TEST_PREFIX}%`,
  ]);
}

async function seedFixtures(connection, ownerId, count) {
  const batchSize = 1000;

  for (let start = 0; start < count; start += batchSize) {
    const rows = [];

    for (
      let index = start;
      index < Math.min(start + batchSize, count);
      index++
    ) {
      rows.push(createTripRow(ownerId, index));
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

function sphericalDistanceKm(first, second) {
  const radians = Math.PI / 180;
  const cosine =
    Math.cos(first.lat * radians) *
      Math.cos(second.lat * radians) *
      Math.cos((second.lng - first.lng) * radians) +
    Math.sin(first.lat * radians) * Math.sin(second.lat * radians);

  return 6371 * Math.acos(Math.min(1, Math.max(-1, cosine)));
}

async function databaseStrategy(connection) {
  const [rows] = await connection.query(
    `
    SELECT matching_trips.id, matching_trips.pickup_distance,
      matching_trips.destination_distance
    FROM (
      SELECT
        trips.id,
        (
          6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(?)) *
              COS(RADIANS(trips.origin_lat)) *
              COS(RADIANS(trips.origin_lng) - RADIANS(?)) +
              SIN(RADIANS(?)) *
              SIN(RADIANS(trips.origin_lat))
            ))
          )
        ) AS pickup_distance,
        (
          6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(?)) *
              COS(RADIANS(trips.destination_lat)) *
              COS(RADIANS(trips.destination_lng) - RADIANS(?)) +
              SIN(RADIANS(?)) *
              SIN(RADIANS(trips.destination_lat))
            ))
          )
        ) AS destination_distance
      FROM trips
      JOIN users ON trips.creator_id = users.id
      WHERE trips.origin_lat IS NOT NULL
        AND trips.origin_lng IS NOT NULL
        AND trips.destination_lat IS NOT NULL
        AND trips.destination_lng IS NOT NULL
    ) AS matching_trips
    WHERE matching_trips.pickup_distance <= ?
      AND matching_trips.destination_distance <= ?
    ORDER BY
      (matching_trips.pickup_distance + matching_trips.destination_distance) ASC,
      matching_trips.id ASC
    LIMIT ?
    `,
    [
      REQUESTED_ORIGIN.lat,
      REQUESTED_ORIGIN.lng,
      REQUESTED_ORIGIN.lat,
      REQUESTED_DESTINATION.lat,
      REQUESTED_DESTINATION.lng,
      REQUESTED_DESTINATION.lat,
      PICKUP_RADIUS_KM,
      DESTINATION_RADIUS_KM,
      LIMIT,
    ],
  );

  return rows;
}

async function applicationStrategy(connection) {
  const [rows] = await connection.query(
    `
    SELECT trips.id, trips.origin_lat, trips.origin_lng,
      trips.destination_lat, trips.destination_lng
    FROM trips
    JOIN users ON trips.creator_id = users.id
    WHERE trips.origin_lat IS NOT NULL
      AND trips.origin_lng IS NOT NULL
      AND trips.destination_lat IS NOT NULL
      AND trips.destination_lng IS NOT NULL
    `,
  );

  return rows
    .map((row) => ({
      id: row.id,
      pickup_distance: sphericalDistanceKm(REQUESTED_ORIGIN, {
        lat: Number(row.origin_lat),
        lng: Number(row.origin_lng),
      }),
      destination_distance: sphericalDistanceKm(REQUESTED_DESTINATION, {
        lat: Number(row.destination_lat),
        lng: Number(row.destination_lng),
      }),
    }))
    .filter(
      (row) =>
        row.pickup_distance <= PICKUP_RADIUS_KM &&
        row.destination_distance <= DESTINATION_RADIUS_KM,
    )
    .sort(
      (first, second) =>
        first.pickup_distance +
          first.destination_distance -
          (second.pickup_distance + second.destination_distance) ||
        Number(first.id) - Number(second.id),
    )
    .slice(0, LIMIT);
}

async function timed(operation) {
  const start = performance.now();
  const rows = await operation();
  return { rows, milliseconds: performance.now() - start };
}

function summarize(times) {
  const minimum = Math.min(...times);
  const maximum = Math.max(...times);
  const mean = times.reduce((sum, time) => sum + time, 0) / times.length;

  return { minimum, maximum, mean };
}

function assertSameResult(databaseRows, applicationRows) {
  const databaseIds = databaseRows.map((row) => Number(row.id)).join(",");
  const applicationIds = applicationRows.map((row) => Number(row.id)).join(",");

  if (databaseIds !== applicationIds) {
    throw new Error("Strategierna returnerade inte samma sorterade urval.");
  }
}

async function benchmarkDataset(connection, ownerId, datasetSize) {
  await cleanupFixtures(connection);
  await seedFixtures(connection, ownerId, datasetSize);

  const [[totalRow]] = await connection.query(
    "SELECT COUNT(*) AS count FROM trips WHERE origin_lat IS NOT NULL AND destination_lat IS NOT NULL",
  );
  const totalRows = Number(totalRow.count);

  await databaseStrategy(connection);
  await applicationStrategy(connection);

  const databaseTimes = [];
  const applicationTimes = [];
  let returnedRows = 0;

  for (let run = 0; run < RUNS; run++) {
    const first = run % 2 === 0 ? databaseStrategy : applicationStrategy;
    const second = run % 2 === 0 ? applicationStrategy : databaseStrategy;
    const firstResult = await timed(() => first(connection));
    const secondResult = await timed(() => second(connection));
    const databaseResult = run % 2 === 0 ? firstResult : secondResult;
    const applicationResult = run % 2 === 0 ? secondResult : firstResult;

    assertSameResult(databaseResult.rows, applicationResult.rows);
    databaseTimes.push(databaseResult.milliseconds);
    applicationTimes.push(applicationResult.milliseconds);
    returnedRows = databaseResult.rows.length;
  }

  return {
    insertedRows: datasetSize,
    totalRows,
    returnedRows,
    database: summarize(databaseTimes),
    application: summarize(applicationTimes),
  };
}

function format(value) {
  return value.toFixed(2);
}

async function run() {
  const connection = await connectDb();

  try {
    const ownerId = await getFixtureOwnerId(connection);
    console.log(
      "Jämförelsetest: SQL-baserad och backend-baserad ruttfiltrering",
    );
    console.log(
      `Radier: ${PICKUP_RADIUS_KM.toFixed(1)} km / ${DESTINATION_RADIUS_KM.toFixed(1)} km; körningar: ${RUNS}; max antal returnerade resor: ${LIMIT}`,
    );

    for (const datasetSize of DATASET_SIZES) {
      const result = await benchmarkDataset(connection, ownerId, datasetSize);
      const ratio = result.application.mean / result.database.mean;

      console.log("");
      console.log(
        `Tillfälligt infogade resor: ${result.insertedRows}; totalt mätta rader: ${result.totalRows}; returnerade: ${result.returnedRows}`,
      );
      console.log(
        `SQL-filtrering - min ${format(result.database.minimum)} ms, max ${format(result.database.maximum)} ms, medel ${format(result.database.mean)} ms`,
      );
      console.log(
        `Backend-filtrering - min ${format(result.application.minimum)} ms, max ${format(result.application.maximum)} ms, medel ${format(result.application.mean)} ms`,
      );
      console.log(`Kvot backend/SQL: ${ratio.toFixed(2)}x`);
    }
  } finally {
    await cleanupFixtures(connection);
    await connection.end();
  }
}

run().catch((error) => {
  console.error(`Jämförelsetest: MISSLYCKADES - ${error.message}`);
  process.exit(1);
});
