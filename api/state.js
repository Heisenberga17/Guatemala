import { neon } from "@neondatabase/serverless";

const CONN =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

const TRIP = process.env.TRIP_ID || "guatemala-2026";
const PIN = process.env.EDIT_PIN || "";

let sql = null;
let schemaReady = false;

async function connect() {
  if (!CONN) {
    const err = new Error("No hay base de datos configurada (falta DATABASE_URL).");
    err.code = "NO_DB";
    throw err;
  }
  if (!sql) sql = neon(CONN);
  if (!schemaReady) {
    await sql`create table if not exists trip_state (
      id text primary key,
      data jsonb not null default '{}'::jsonb,
      rev integer not null default 0,
      updated_at timestamptz not null default now()
    )`;
    await sql`create table if not exists trip_history (
      id bigserial primary key,
      trip_id text not null,
      rev integer not null,
      data jsonb not null,
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists trip_history_trip_idx on trip_history (trip_id, rev desc)`;
    schemaReady = true;
  }
  return sql;
}

async function read(db) {
  const rows = await db`select data, rev, updated_at from trip_state where id = ${TRIP}`;
  if (!rows.length) return { data: {}, rev: 0, updatedAt: null };
  return { data: rows[0].data, rev: rows[0].rev, updatedAt: rows[0].updated_at };
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  let db;
  try {
    db = await connect();
  } catch (e) {
    const status = e.code === "NO_DB" ? 501 : 500;
    return res.status(status).json({ error: e.message });
  }

  try {
    if (req.method === "GET") {
      const state = await read(db);
      return res.status(200).json({ ...state, pinRequired: !!PIN });
    }

    if (req.method === "PUT" || req.method === "POST") {
      if (PIN && req.headers["x-pin"] !== PIN) {
        return res.status(401).json({ error: "PIN incorrecto" });
      }
      const body = parseBody(req);
      const data = body.data;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Falta el campo data" });
      }

      const current = await read(db);
      // Control de versiones: si alguien más guardó mientras tanto, avisamos.
      if (body.rev != null && Number(body.rev) !== current.rev && !body.force) {
        return res.status(409).json({ error: "El plan cambió en otro dispositivo", ...current });
      }

      const rev = current.rev + 1;
      const json = JSON.stringify(data);
      await db`
        insert into trip_state (id, data, rev, updated_at)
        values (${TRIP}, ${json}::jsonb, ${rev}, now())
        on conflict (id) do update
          set data = excluded.data, rev = excluded.rev, updated_at = now()`;
      await db`insert into trip_history (trip_id, rev, data) values (${TRIP}, ${rev}, ${json}::jsonb)`;
      // Nos quedamos con las últimas 50 versiones.
      await db`
        delete from trip_history
        where trip_id = ${TRIP}
          and rev <= ${rev - 50}`;

      return res.status(200).json({ ok: true, rev, updatedAt: new Date().toISOString() });
    }

    res.setHeader("Allow", "GET, PUT, POST");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
