const axios = require("axios");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../backend/.env"),
  quiet: true,
});

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const REQUEST_COUNT = Number(process.env.REQUEST_COUNT || 50);
const AVAILABLE_SEATS = Number(process.env.AVAILABLE_SEATS || 1);
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET_KEY) {
  console.error("JWT_SECRET_KEY saknas i backend/.env");
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

async function upsertUser(connection, firstName, lastName, email) {
  await connection.query(
    `
    INSERT INTO users (first_name, last_name, email, password_hash)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      first_name = VALUES(first_name),
      last_name = VALUES(last_name)
    `,
    [firstName, lastName, email, "race-test-password-hash"],
  );

  const [[user]] = await connection.query(
    `
    SELECT id, first_name, last_name, email
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [email],
  );

  return user;
}

async function cleanupPreviousRaceTest(connection) {
  const [testTrips] = await connection.query(
    `
    SELECT id
    FROM trips
    WHERE origin LIKE 'Race Test Origin%'
       OR destination LIKE 'Race Test Destination%'
    `,
  );

  const tripIds = testTrips.map((trip) => trip.id);

  if (tripIds.length > 0) {
    await connection.query("DELETE FROM notifications WHERE trip_id IN (?)", [
      tripIds,
    ]);
    await connection.query(
      "DELETE FROM trip_participants WHERE trip_id IN (?)",
      [tripIds],
    );
    await connection.query(
      "DELETE FROM interest_requests WHERE trip_id IN (?)",
      [tripIds],
    );
    await connection.query("DELETE FROM trips WHERE id IN (?)", [tripIds]);
  }
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
      "Race Test Origin",
      "Race Test Destination",
      59.3293,
      18.0686,
      59.8586,
      17.6389,
      "2026-06-01",
      AVAILABLE_SEATS,
      "Synthetic race condition test trip",
      "Offering",
    ],
  );

  return result.insertId;
}

async function createPendingRequests(connection, tripId, ownerId) {
  const requestIds = [];

  for (let i = 1; i <= REQUEST_COUNT; i++) {
    const requester = await upsertUser(
      connection,
      `RaceRequester${i}`,
      "Test",
      `race-requester-${i}@catchme.test`,
    );

    const [result] = await connection.query(
      `
      INSERT INTO interest_requests (trip_id, requester_id, owner_id, status)
      VALUES (?, ?, ?, 'pending')
      `,
      [tripId, requester.id, ownerId],
    );

    requestIds.push(result.insertId);
  }

  return requestIds;
}

async function countAccepted(connection, tripId) {
  const [[row]] = await connection.query(
    `
    SELECT COUNT(*) AS accepted
    FROM interest_requests
    WHERE trip_id = ? AND status = 'accepted'
    `,
    [tripId],
  );

  return Number(row.accepted || 0);
}

async function countPassengers(connection, tripId) {
  const [[row]] = await connection.query(
    `
    SELECT COUNT(*) AS passengers
    FROM trip_participants
    WHERE trip_id = ? AND role = 'passenger'
    `,
    [tripId],
  );

  return Number(row.passengers || 0);
}

async function run() {
  const connection = await connectDb();

  try {
    await cleanupPreviousRaceTest(connection);

    const owner = await upsertUser(
      connection,
      "RaceOwner",
      "Test",
      "race-owner@catchme.test",
    );

    const ownerToken = createJwt({
      id: owner.id,
      email: owner.email,
      first_name: owner.first_name,
      last_name: owner.last_name,
    });

    const tripId = await createTrip(connection, owner.id);
    const requestIds = await createPendingRequests(
      connection,
      tripId,
      owner.id,
    );

    const acceptedBefore = await countAccepted(connection, tripId);
    const passengersBefore = await countPassengers(connection, tripId);

    const responses = await Promise.all(
      requestIds.map((id) =>
        axios
          .patch(
            `${BASE_URL}/interest_requests/${id}/accept`,
            {},
            {
              headers: {
                Authorization: `Bearer ${ownerToken}`,
              },
            },
          )
          .catch((error) => ({
            status: error.response?.status || 0,
            data: error.response?.data || { message: error.message },
          })),
      ),
    );

    const acceptedAfter = await countAccepted(connection, tripId);
    const passengersAfter = await countPassengers(connection, tripId);

    const statusCounts = responses.reduce((acc, response) => {
      acc[response.status] = (acc[response.status] || 0) + 1;
      return acc;
    }, {});

    const successfulHttpCalls = responses.filter(
      (response) => response.status === 200,
    ).length;

    const capacityOk = acceptedAfter <= AVAILABLE_SEATS;
    const participantsOk = passengersAfter <= AVAILABLE_SEATS;

    console.log("Test av kontroll vid samtidiga godkännanden");
    console.log(`Tillgängliga platser: ${AVAILABLE_SEATS}`);
    console.log(`Pending-intresseanmälningar: ${requestIds.length}`);
    console.log(`Parallella godkännandeanrop: ${requestIds.length}`);
    console.log(`Lyckade godkännanden: ${successfulHttpCalls}`);
    console.log(
      `Avvisade godkännanden: ${requestIds.length - successfulHttpCalls}`,
    );
    console.log(`Accepterade intresseanmälningar efter test: ${acceptedAfter}`);
    console.log(`Deltagare i resan efter test: ${passengersAfter}`);
    console.log(
      `Resultat: ${capacityOk && participantsOk ? "Godkänt" : "Underkänt"}`,
    );

    process.exit(capacityOk && participantsOk ? 0 : 1);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
