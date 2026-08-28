function config() {
  const secretKey = (process.env.SUPABASE_SECRET_KEY || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return {
    url: (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, ""),
    key: secretKey || serviceRoleKey,
    serviceRoleKey,
  };
}

export function supabaseConfigured() {
  const { url, key } = config();
  return Boolean(url && key);
}

function headers(extra = {}) {
  const { key, serviceRoleKey } = config();
  const result = {
    apikey: key,
    ...extra,
  };
  if (serviceRoleKey) result.Authorization = `Bearer ${serviceRoleKey}`;
  return result;
}

function rowToStudent(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash || undefined,
    sessionToken: row.session_token || undefined,
    createdAt: row.created_at,
    usage: row.usage || {},
    practice: row.practice || null,
  };
}

async function request(path, options = {}) {
  const { url } = config();
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: headers(options.headers),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function getStudentByIdRemote(id) {
  const rows = await request(`/rest/v1/students?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rowToStudent(rows[0]);
}

export async function getStudentByEmailRemote(email) {
  const rows = await request(`/rest/v1/students?select=*&email=eq.${encodeURIComponent(email)}&limit=1`);
  return rowToStudent(rows[0]);
}

export async function getStudentBySessionTokenRemote(token) {
  const rows = await request(`/rest/v1/students?select=*&session_token=eq.${encodeURIComponent(token)}&limit=1`);
  return rowToStudent(rows[0]);
}

export async function putStudentRemote(student) {
  const row = {
    id: student.id,
    name: student.name,
    email: student.email,
    password_hash: student.passwordHash || null,
    session_token: student.sessionToken || null,
    created_at: student.createdAt,
    usage: student.usage || {},
    practice: student.practice || null,
  };
  await request("/rest/v1/students?on_conflict=id", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  return student;
}
