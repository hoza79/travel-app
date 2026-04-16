const mysql = require("mysql2/promise");
const { faker } = require("@faker-js/faker");
require("dotenv").config({ path: "../backend/.env" });

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const count = 50000;
  console.log(`🚀 Startar seeding av ${count} resor...`);

  for (let i = 0; i < count; i++) {
    const trip = [
      1,
      `${faker.location.city()}, Sweden`,
      `${faker.location.city()}, Sweden`,
      faker.location.latitude({ max: 69, min: 55 }),
      faker.location.longitude({ max: 24, min: 11 }),
      faker.location.latitude({ max: 69, min: 55 }),
      faker.location.longitude({ max: 24, min: 11 }),
      faker.date.future().toISOString().split("T")[0],
      faker.number.int({ min: 1, max: 4 }),
      faker.lorem.sentence(),
      faker.helpers.arrayElement(["Offering", "Searching"]),
    ];

    await connection.execute(
      `INSERT INTO trips 
      (creator_id, origin, destination, origin_lat, origin_lng, destination_lat, destination_lng, trip_date, available_seats, description, type) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      trip,
    );

    if (i % 500 === 0) console.log(`✅ ${i} rader klara...`);
  }

  console.log("✨ Databasen är nu fylld!");
  await connection.end();
}

seed().catch(console.error);
