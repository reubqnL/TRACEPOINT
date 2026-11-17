import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";

import { InvestigationRepository, openDatabase } from "../electron/database";
import { LATEST_SCHEMA_VERSION } from "../electron/database/schema";
import { NotFoundError, ValidationError } from "../electron/errors";

const valid = { name: "Case 001", username: "octocat", platform: "github" } as const;

function makeRepo(start = "2026-01-01T00:00:00.000Z") {
    let t = new Date(start).getTime();
    const db = openDatabase(":memory:");
    const repo = new InvestigationRepository(db, () => new Date((t += 1000)));
    return { db, repo };
}

describe("InvestigationRepository", () => {
    it("creates with defaults, a UUID and matching timestamps", () => {
        const { repo } = makeRepo();
        const inv = repo.create({ ...valid, username: "@octocat", name: "  Case 001  " });
        assert.match(inv.id, /^[0-9a-f-]{36}$/);
        assert.equal(inv.name, "Case 001"); // trimmed
        assert.equal(inv.username, "octocat"); // leading @ removed
        assert.equal(inv.status, "active");
        assert.equal(inv.createdAt, inv.updatedAt);
    });

    it("retrieves one and all, most recently updated first", () => {
        const { repo } = makeRepo();
        const a = repo.create({ ...valid, name: "A" });
        const b = repo.create({ ...valid, name: "B" });
        assert.deepEqual(repo.getById(a.id), a);
        assert.deepEqual(repo.getAll().map((i) => i.name), ["B", "A"]);
        repo.update(a.id, { status: "paused" });
        assert.deepEqual(repo.getAll().map((i) => i.name), ["A", "B"]);
        void b;
    });

    it("updates only the given fields and bumps updatedAt, not createdAt", () => {
        const { repo } = makeRepo();
        const inv = repo.create(valid);
        const up = repo.update(inv.id, { status: "completed", name: "Renamed" });
        assert.equal(up.status, "completed");
        assert.equal(up.name, "Renamed");
        assert.equal(up.username, inv.username);
        assert.equal(up.createdAt, inv.createdAt);
        assert.ok(up.updatedAt > inv.updatedAt);
    });

    it("deletes, and reports NOT_FOUND afterwards", () => {
        const { repo } = makeRepo();
        const inv = repo.create(valid);
        repo.delete(inv.id);
        assert.equal(repo.getAll().length, 0);
        assert.throws(() => repo.getById(inv.id), NotFoundError);
        assert.throws(() => repo.delete(inv.id), NotFoundError);
        assert.throws(() => repo.update(inv.id, { name: "x" }), NotFoundError);
    });

    it("rejects invalid input with per-field messages", () => {
        const { repo } = makeRepo();
        const cases: [unknown, string][] = [
            [{ ...valid, name: "   " }, "name"],
            [{ ...valid, name: "x".repeat(121) }, "name"],
            [{ ...valid, username: "two words" }, "username"],
            [{ ...valid, platform: "myspace" }, "platform"],
            [{ ...valid, status: "archived" }, "status"],
            [{ ...valid, id: "forged" }, "id"],
            [null, "_"],
        ];
        for (const [input, field] of cases) {
            assert.throws(
                () => repo.create(input),
                (e: unknown) => e instanceof ValidationError && field in (e.fields ?? {}),
                `expected ${field} error for ${JSON.stringify(input)}`,
            );
        }
        assert.throws(() => repo.update("x", {}), ValidationError);
        assert.throws(() => repo.update("x", { createdAt: "2000-01-01" }), ValidationError);
    });

    it("is safe against SQL injection in values and ids", () => {
        const { repo } = makeRepo();
        const inv = repo.create({ ...valid, name: "x'); DROP TABLE investigations;--" });
        assert.equal(repo.getAll().length, 1);
        assert.throws(() => repo.getById("' OR '1'='1"), NotFoundError);
        assert.equal(repo.getById(inv.id).name, "x'); DROP TABLE investigations;--");
    });

    it("wraps storage failures in a DatabaseError that hides internals", () => {
        const { db, repo } = makeRepo();
        db.exec("DROP TABLE investigations");
        assert.throws(
            () => repo.getAll(),
            (e: unknown) => {
                const err = e as { code: string; message: string };
                return err.code === "DATABASE" && !/investigations|SQL|no such table/i.test(err.message);
            },
        );
    });
});

describe("database", () => {
    it("enforces constraints at the SQL level even if app validation is bypassed", () => {
        const { db } = makeRepo();
        const insert = (status: string) =>
            db.prepare(
                "INSERT INTO investigations VALUES ('id','n','u','github', ?, 't', 't')",
            ).run(status);
        assert.throws(() => insert("bogus"), /CHECK/);
        assert.doesNotThrow(() => insert("paused"));
    });

    it("persists across close and reopen (the restart requirement)", () => {
        const dir = mkdtempSync(join(tmpdir(), "tracepoint-"));
        const file = join(dir, "tracepoint.db");
        try {
            const first = openDatabase(file);
            const created = new InvestigationRepository(first).create(valid);
            first.close();

            const second = openDatabase(file);
            const all = new InvestigationRepository(second).getAll();
            assert.deepEqual(all, [created]);
            second.close();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("migrates idempotently and records the schema version", () => {
        const dir = mkdtempSync(join(tmpdir(), "tracepoint-"));
        const file = join(dir, "t.db");
        try {
            openDatabase(file).close();
            openDatabase(file).close(); // second open must not re-run migrations
            const raw = new DatabaseSync(file);
            const v = raw.prepare("PRAGMA user_version").get() as { user_version: number };
            assert.equal(v.user_version, LATEST_SCHEMA_VERSION);
            raw.close();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("refuses a database from a newer version of the app", () => {
        const dir = mkdtempSync(join(tmpdir(), "tracepoint-"));
        const file = join(dir, "t.db");
        try {
            const raw = new DatabaseSync(file);
            raw.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 1}`);
            raw.close();
            assert.throws(() => openDatabase(file), (e: unknown) => (e as { code: string }).code === "DATABASE");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
