const axios = require("axios");

const URL =
  "https://causal-trustless-levitate.ngrok-free.dev/interest_requests";
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJNZXNzaUBob3RtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJMaW9uZWwiLCJsYXN0X25hbWUiOiJNZXNzaSIsImlhdCI6MTc3NjE1OTY3OCwiZXhwIjoxNzc2MjQ2MDc4fQ.qKEdB2DlaSKkpGUVj2McaYwH4-Iz7U-5THbC1_BEzhw";

async function run() {
  const reqs = [];
  for (let i = 0; i < 50; i++) {
    reqs.push(
      axios
        .post(
          URL,
          { tripId: 3, ownerId: 1, requesterId: 200 + i },
          { headers: { Authorization: `Bearer ${TOKEN}` } },
        )
        .catch((e) => e.response),
    );
  }
  const res = await Promise.all(reqs);
  console.log(
    "Lyckade:",
    res.filter((r) => r.status === 201 || r.status === 200).length,
  );
  console.log("Nekade:", res.filter((r) => r.status === 400).length);
}
run();
