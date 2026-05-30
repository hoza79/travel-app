const axios = require("axios");
const mysql = require("mysql2/promise");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../backend/.env"),
  quiet: true,
});

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const TEST_PREFIX = "ROUTE_FILTER_FUNCTIONAL_TEST_";
const PICKUP_RADIUS_KM = 0.5;
const DESTINATION_RADIUS_KM = 0.5;

// Fixed reference points keep the test independent of external geocoding APIs.
const REQUESTED_ORIGIN = { lat: 62.3921, lng: 17.3069 };
const REQUESTED_DESTINATION = { lat: 63.1771, lng: 14.6362 };

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
    throw new Error("Testet kräver minst en användare i users-tabellen.");
  }

  return user.id;
}

function offsetNorth(point, metres) {
  return {
    lat: point.lat + metres / 111320,
    lng: point.lng,
  };
}

function fixtureTrip(ownerId, name, originMetres, destinationMetres) {
  const origin = offsetNorth(REQUESTED_ORIGIN, originMetres);
  const destination = offsetNorth(REQUESTED_DESTINATION, destinationMetres);

  return [
    ownerId,
    `${TEST_PREFIX}${name}_ORIGIN`,
    `${TEST_PREFIX}${name}_DESTINATION`,
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    "2026-06-01",
    2,
    `${TEST_PREFIX}${name}`,
    "Offering",
  ];
}

async function cleanupFixtures(connection) {
  await connection.query("DELETE FROM trips WHERE description LIKE ?", [
    `${TEST_PREFIX}%`,
  ]);
}

async function seedFixtures(connection, ownerId) {
  const fixtures = [
    fixtureTrip(ownerId, "MATCH_NEAREST", 80, 90),
    fixtureTrip(ownerId, "MATCH_SECOND", 230, 310),
    fixtureTrip(ownerId, "OUTSIDE_PICKUP", 650, 100),
    fixtureTrip(ownerId, "OUTSIDE_DESTINATION", 100, 650),
  ];

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
    VALUES ?
    `,
    [fixtures],
  );

  return {
    matchNearestId: result.insertId,
    matchSecondId: result.insertId + 1,
    outsidePickupId: result.insertId + 2,
    outsideDestinationId: result.insertId + 3,
  };
}

async function requestMatches() {
  const response = await axios.get(`${BASE_URL}/post/route-search`, {
    params: {
      originLat: REQUESTED_ORIGIN.lat,
      originLng: REQUESTED_ORIGIN.lng,
      destinationLat: REQUESTED_DESTINATION.lat,
      destinationLng: REQUESTED_DESTINATION.lng,
      pickupRadiusKm: PICKUP_RADIUS_KM,
      destinationRadiusKm: DESTINATION_RADIUS_KM,
      offset: 0,
      limit: 100,
    },
  });

  return response.data;
}

function assertFixtureMatches(rows, ids) {
  const fixtureRows = rows.filter((row) =>
    String(row.description || "").startsWith(TEST_PREFIX),
  );
  const actualIds = fixtureRows.map((row) => Number(row.id));
  const expectedIds = [ids.matchNearestId, ids.matchSecondId];

  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error(
      `Fel matchningar. Förväntade ${expectedIds.join(", ")}, fick ${actualIds.join(", ")}.`,
    );
  }

  for (const row of fixtureRows) {
    if (
      Number(row.pickup_distance) > PICKUP_RADIUS_KM ||
      Number(row.destination_distance) > DESTINATION_RADIUS_KM
    ) {
      throw new Error(`Resa ${row.id} returnerades trots överskriden radie.`);
    }
  }

  const excludedIds = [ids.outsidePickupId, ids.outsideDestinationId];
  if (rows.some((row) => excludedIds.includes(Number(row.id)))) {
    throw new Error("En resa som ligger utanför en av radierna returnerades.");
  }

  return fixtureRows;
}

async function run() {
  const connection = await connectDb();

  try {
    await cleanupFixtures(connection);
    const ownerId = await getFixtureOwnerId(connection);
    const ids = await seedFixtures(connection, ownerId);
    const rows = await requestMatches();
    const matches = assertFixtureMatches(rows, ids);

    console.log("Funktionstest av ruttfilter med tva avstandsvillkor: GODKANT");
    console.log(
      `Valda radier: ${PICKUP_RADIUS_KM.toFixed(1)} km vid start och ${DESTINATION_RADIUS_KM.toFixed(1)} km vid mal`,
    );
    console.log("Kontrollerade testresor: 4");
    console.log("Returnerade testresor: 2");

    for (const row of matches) {
      console.log(
        `${row.description}: start ${Number(row.pickup_distance).toFixed(3)} km, mal ${Number(row.destination_distance).toFixed(3)} km`,
      );
    }

    console.log(
      "Exkluderade fall: start utanfor radie samt mal utanfor radie.",
    );
  } finally {
    await cleanupFixtures(connection);
    await connection.end();
  }
}

run().catch((error) => {
  console.error(`Funktionstest av ruttfilter: MISSLYCKADES - ${error.message}`);
  process.exit(1);
});
