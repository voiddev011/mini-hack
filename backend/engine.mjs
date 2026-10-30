import { DatabaseSync } from "node:sqlite";
import {
  RESOURCES,
  VENUES,
  InputError,
  validate,
  allocate,
  alternatives,
  expandSeries,
} from "../shared/scheduling.mjs";
export * from "../shared/scheduling.mjs";
export function createStore(path = ":memory:") {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS venues(id TEXT PRIMARY KEY,name TEXT NOT NULL,projectors INTEGER NOT NULL,audio INTEGER NOT NULL,staff INTEGER NOT NULL);" +
      "CREATE TABLE IF NOT EXISTS halls(id TEXT PRIMARY KEY,venue TEXT NOT NULL REFERENCES venues(id),capacity INTEGER NOT NULL);" +
      "CREATE TABLE IF NOT EXISTS clients(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE);" +
      "CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY,clientId INTEGER NOT NULL REFERENCES clients(id),client TEXT NOT NULL,title TEXT NOT NULL,date TEXT NOT NULL,start TEXT NOT NULL,end TEXT NOT NULL,attendees INTEGER NOT NULL,preferredVenue TEXT NOT NULL REFERENCES venues(id),projectors INTEGER NOT NULL,audio INTEGER NOT NULL,staff INTEGER NOT NULL,reservedStart INTEGER NOT NULL,reservedEnd INTEGER NOT NULL,venue TEXT REFERENCES venues(id),hall TEXT REFERENCES halls(id),status TEXT NOT NULL CHECK(status IN ('confirmed','rejected','cancelled')),reason TEXT,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);" +
      "CREATE INDEX IF NOT EXISTS booking_schedule ON bookings(date,status,venue);" +
      "CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,bookingId INTEGER REFERENCES bookings(id),action TEXT NOT NULL,detail TEXT NOT NULL,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  );
  for (const v of VENUES) {
    db.prepare("INSERT OR IGNORE INTO venues VALUES(?,?,?,?,?)").run(
      v.id,
      v.name,
      v.projectors,
      v.audio,
      v.staff,
    );
    for (const h of v.halls)
      db.prepare("INSERT OR IGNORE INTO halls VALUES(?,?,?)").run(
        h.id,
        v.id,
        h.capacity,
      );
  }
  if (
    !db
      .prepare("PRAGMA table_info(bookings)")
      .all()
      .some((column) => column.name === "budget")
  )
    db.exec("ALTER TABLE bookings ADD COLUMN budget REAL");
  const list = () =>
    db.prepare("SELECT * FROM bookings ORDER BY date,start,id").all();
  function transaction(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  const log = (id, action, detail) =>
    db
      .prepare("INSERT INTO audit(bookingId,action,detail) VALUES(?,?,?)")
      .run(id, action, detail);
  function evaluate(input, excludeId) {
    const request = validate(input),
      bookings = list().filter((b) => b.id !== excludeId);
    const decision = allocate(request, bookings);
    return {
      request,
      decision,
      suggestions: decision.ok ? [] : alternatives(request, bookings),
    };
  }
  function persist(request, decision) {
    db.prepare("INSERT OR IGNORE INTO clients(name) VALUES(?)").run(
      request.client,
    );
    const clientId = db
      .prepare("SELECT id FROM clients WHERE name=?")
      .get(request.client).id;
    const keys = [
      "client",
      "title",
      "date",
      "start",
      "end",
      "attendees",
      "preferredVenue",
      ...RESOURCES,
      "reservedStart",
      "reservedEnd",
      "budget",
    ];
    const saved = db
      .prepare(
        "INSERT INTO bookings(clientId," +
          keys.join(",") +
          ",venue,hall,status,reason) VALUES(" +
          Array(keys.length + 5)
            .fill("?")
            .join(",") +
          ")",
      )
      .run(
        clientId,
        ...keys.map((k) => request[k] ?? null),
        decision.venue || null,
        decision.hall || null,
        decision.ok ? "confirmed" : "rejected",
        decision.ok ? null : JSON.stringify(decision),
      );
    const id = Number(saved.lastInsertRowid);
    log(
      id,
      decision.ok ? "confirmed" : "rejected",
      decision.ok
        ? "Allocated " + decision.hall + " with all requested resources."
        : decision.message,
    );
    return db.prepare("SELECT * FROM bookings WHERE id=?").get(id);
  }
  function book(input) {
    return transaction(() => {
      const result = evaluate(input);
      if (
        input.expectedHall !== undefined &&
        result.decision.hall !== input.expectedHall
      )
        throw new InputError(
          "Availability changed. Validate the request again before confirming.",
        );
      return { ...result, booking: persist(result.request, result.decision) };
    });
  }
  // Rejected submissions are recorded atomically; a feasible preview never confirms a booking.
  function preview(input) {
    return transaction(() => {
      const result = evaluate(input);
      return result.decision.ok
        ? result
        : { ...result, booking: persist(result.request, result.decision) };
    });
  }
  function reschedule(id, input) {
    return transaction(() => {
      const original = db.prepare("SELECT * FROM bookings WHERE id=?").get(id);
      if (!original || original.status !== "confirmed")
        throw new InputError(
          "Only an existing confirmed booking can be rescheduled.",
        );
      const result = evaluate({ ...original, ...input }, id),
        { request: r, decision: d } = result;
      if (!d.ok) {
        log(
          id,
          "reschedule declined",
          "Original booking preserved. " + d.message,
        );
        return { ...result, booking: original, preserved: true };
      }
      db.prepare("INSERT OR IGNORE INTO clients(name) VALUES(?)").run(r.client);
      const clientId = db
        .prepare("SELECT id FROM clients WHERE name=?")
        .get(r.client).id;
      const keys = [
        "client",
        "title",
        "date",
        "start",
        "end",
        "attendees",
        "preferredVenue",
        ...RESOURCES,
        "reservedStart",
        "reservedEnd",
        "budget",
      ];
      db.prepare(
        "UPDATE bookings SET clientId=?," +
          keys.map((k) => k + "=?").join(",") +
          ",venue=?,hall=?,reason=NULL WHERE id=?",
      ).run(clientId, ...keys.map((k) => r[k] ?? null), d.venue, d.hall, id);
      log(
        id,
        "rescheduled",
        original.date +
          " " +
          original.start +
          " " +
          original.hall +
          " → " +
          r.date +
          " " +
          r.start +
          " " +
          d.hall,
      );
      return {
        ...result,
        booking: db.prepare("SELECT * FROM bookings WHERE id=?").get(id),
      };
    });
  }
  function cancel(id) {
    return transaction(() => {
      const row = db.prepare("SELECT * FROM bookings WHERE id=?").get(id);
      if (!row || row.status !== "confirmed")
        throw new InputError(
          "Only an existing confirmed booking can be cancelled.",
        );
      db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(id);
      log(id, "cancelled", "Hall and venue resources released.");
      return { ok: true };
    });
  }
  function bookMany(requests, mode) {
    if (mode !== "atomic" && mode !== "feasible")
      throw new InputError("Choose atomic or feasible-only booking.");
    if (!Array.isArray(requests) || requests.length < 1 || requests.length > 20)
      throw new InputError("Send between 1 and 20 booking requests.");
    return transaction(() => {
      const parsed = requests.map((input, index) => {
        try {
          return { index, input, request: validate(input) };
        } catch (error) {
          return {
            index,
            input,
            error:
              error instanceof InputError ? error.message : "Invalid request.",
          };
        }
      });
      if (mode === "atomic" && parsed.some((item) => item.error)) {
        return {
          mode,
          committed: false,
          message:
            "Atomic booking stopped because one or more requests are invalid. No bookings were saved.",
          results: parsed.map((item) => ({
            index: item.index,
            ok: false,
            error:
              item.error ||
              "Not saved because the series did not pass every check.",
            input: item.input,
          })),
        };
      }
      let existing = list();
      const planned = [];
      for (const item of parsed) {
        if (item.error) {
          planned.push({
            index: item.index,
            input: item.input,
            error: item.error,
            ok: false,
          });
          continue;
        }
        const decision = allocate(item.request, existing);
        planned.push({
          index: item.index,
          input: item.input,
          request: item.request,
          decision,
          suggestions: decision.ok ? [] : alternatives(item.request, existing),
          ok: decision.ok,
        });
        if (decision.ok)
          existing = existing.concat({
            ...item.request,
            hall: decision.hall,
            venue: decision.venue,
            status: "confirmed",
          });
      }
      if (mode === "atomic" && planned.some((item) => !item.ok)) {
        return {
          mode,
          committed: false,
          message:
            "Atomic booking stopped because a request could not be allocated. No bookings were saved.",
          results: planned,
        };
      }
      return {
        mode,
        committed: true,
        results: planned.map((item) =>
          item.error
            ? item
            : { ...item, booking: persist(item.request, item.decision) },
        ),
      };
    });
  }
  function bookSeries(input) {
    return bookMany(expandSeries(input), input.mode);
  }
  return {
    db,
    list,
    book,
    preview,
    reschedule,
    cancel,
    evaluate,
    bookMany,
    bookSeries,
    audit: () =>
      db.prepare("SELECT * FROM audit ORDER BY id DESC LIMIT 100").all(),
    close: () => db.close(),
  };
}
