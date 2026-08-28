import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

process.env.GREEN_ROOM_DATA_DIR = "/tmp/green-room-auth-unit";

const { app, bearerToken, hashPassword, issueSessionToken, publicStudent, verifyPassword } = await import("./server.js");

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server?.close());

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  return { response, body: await response.json() };
}

test("passwords are salted scrypt hashes", () => {
  const password = "correct horse battery staple";
  const first = hashPassword(password);
  const second = hashPassword(password);

  assert.match(first, /^scrypt:/);
  assert.match(second, /^scrypt:/);
  assert.notEqual(first, password);
  assert.notEqual(first, second);
});

test("hashed password verification accepts only the original password", () => {
  const student = { passwordHash: hashPassword("another good password") };

  assert.equal(verifyPassword(student, "another good password"), true);
  assert.equal(verifyPassword(student, "wrong password"), false);
  assert.equal(verifyPassword({}, "anything"), false);
});

test("session tokens are opaque and not the student id", () => {
  const student = { id: "student-id-123" };
  const first = issueSessionToken(student);
  const second = issueSessionToken(student);

  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first, student.id);
  assert.notEqual(second, student.id);
  assert.notEqual(first, second);
  assert.equal(student.sessionToken, second);
});

test("audio authentication reads the bearer token from an authorization header", () => {
  assert.equal(bearerToken({ get: (name) => name === "authorization" ? "Bearer session-token" : "" }), "session-token");
  assert.equal(bearerToken({ get: () => "session-token" }), "");
  assert.equal(bearerToken({ get: () => "" }), "");
});

test("public student responses omit password hashes and session tokens", () => {
  const student = {
    id: "student-id-123",
    name: "Auth Tester",
    email: "auth@example.com",
    passwordHash: hashPassword("private password"),
    sessionToken: issueSessionToken({}),
  };

  assert.deepEqual(publicStudent(student), { id: "student-id-123", name: "Auth Tester" });
});

test("responses include the browser hardening headers", async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(response.headers.get("permissions-policy") || "", /camera=\(self\)/);
});

test("registration stores only a password hash and returns an opaque token", async () => {
  const email = `auth-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const { response, body } = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Route Tester", email, password: "route-password" }),
  });

  assert.equal(response.status, 200);
  assert.ok(body.student.id);
  assert.ok(body.token);
  assert.notEqual(body.token, body.student.id);
  const stored = (await import("node:fs/promises")).readFile(`${process.env.GREEN_ROOM_DATA_DIR}/students.json`, "utf8");
  const students = JSON.parse(await stored);
  const student = students.students[body.student.id];
  assert.match(student.passwordHash, /^scrypt:/);
  assert.equal("password" in student, false);
});

test("protected routes reject UUIDs, accept session tokens, and isolate students", async () => {
  const register = async (label) => request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: label,
      email: `auth-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      password: "route-password",
    }),
  });
  const first = (await register("first")).body;
  const second = (await register("second")).body;

  const uuidAttempt = await request("/api/practice/start", {
    method: "POST",
    body: JSON.stringify({ studentId: first.student.id, templateId: "casual", description: "A practice scenario" }),
  });
  assert.equal(uuidAttempt.response.status, 404);

  const speakUuidAttempt = await request("/api/practice/speak", {
    method: "POST",
    body: JSON.stringify({ studentId: first.student.id, text: "hello" }),
  });
  assert.equal(speakUuidAttempt.response.status, 404);

  const tokenStart = await request("/api/practice/start", {
    method: "POST",
    body: JSON.stringify({ studentId: first.token, templateId: "casual", description: "A practice scenario" }),
  });
  assert.equal(tokenStart.response.status, 200);

  const secondStart = await request("/api/practice/start", {
    method: "POST",
    body: JSON.stringify({ studentId: second.token, templateId: "casual", description: "A different scenario" }),
  });
  assert.equal(secondStart.response.status, 200);

  const firstProfile = await request("/api/student/me", { headers: { authorization: `Bearer ${first.token}` } });
  assert.equal(firstProfile.response.status, 200);
  assert.equal(firstProfile.body.student.id, first.student.id);
  assert.deepEqual(Object.keys(firstProfile.body.student).sort(), ["id", "name"]);

  const secondProfile = await request("/api/student/me", { headers: { authorization: `Bearer ${second.token}` } });
  assert.equal(secondProfile.response.status, 200);
  assert.equal(secondProfile.body.student.id, second.student.id);

  const secondData = await request("/api/student/me", { headers: { authorization: `Bearer ${second.student.id}` } });
  assert.equal(secondData.response.status, 401);

  const firstProfileWithUuid = await request("/api/student/me", { headers: { authorization: `Bearer ${first.student.id}` } });
  assert.equal(firstProfileWithUuid.response.status, 401);

  const missingAuth = await request("/api/student/me");
  assert.equal(missingAuth.response.status, 401);
  assert.equal(missingAuth.response.headers.get("www-authenticate"), "Bearer");

  // The removed route is handled by Express's normal 404 response, so it is
  // intentionally checked without assuming a JSON error body.
  const urlTokenRoute = await fetch(`${baseUrl}/api/student/${encodeURIComponent(first.token)}`);
  assert.equal(urlTokenRoute.status, 404);

  const db = JSON.parse(await (await import("node:fs/promises")).readFile(`${process.env.GREEN_ROOM_DATA_DIR}/students.json`, "utf8"));
  assert.equal(db.students[first.student.id].practice.description, "A practice scenario");
  assert.equal(db.students[second.student.id].practice.description, "A different scenario");
});

test("login rotates the session token and invalidates the old token", async () => {
  const email = `rotate-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const registered = (await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Rotation Tester", email, password: "route-password" }),
  })).body;
  const loggedIn = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "route-password" }),
  });

  assert.equal(loggedIn.response.status, 200);
  assert.notEqual(loggedIn.body.token, registered.token);
  assert.equal((await request("/api/student/me", { headers: { authorization: `Bearer ${registered.token}` } })).response.status, 401);
  assert.equal((await request("/api/student/me", { headers: { authorization: `Bearer ${loggedIn.body.token}` } })).response.status, 200);
});

test("legacy plaintext login migrates the password immediately", async () => {
  const email = `legacy-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const fs = await import("node:fs/promises");
  const dbPath = `${process.env.GREEN_ROOM_DATA_DIR}/students.json`;
  const db = JSON.parse(await fs.readFile(dbPath, "utf8"));
  const id = "legacy-student";
  db.students[id] = { id, name: "Legacy", email, password: "legacy-password" };
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "legacy-password" }),
  });
  assert.equal(login.response.status, 200);
  const migrated = JSON.parse(await fs.readFile(dbPath, "utf8")).students[id];
  assert.match(migrated.passwordHash, /^scrypt:/);
  assert.equal("password" in migrated, false);
});
