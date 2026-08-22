import assert from "node:assert/strict";
import test from "node:test";

process.env.GREEN_ROOM_DATA_DIR = "/tmp/green-room-auth-unit";

const { hashPassword, issueSessionToken, publicStudent, verifyPassword } = await import("./server.js");

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
