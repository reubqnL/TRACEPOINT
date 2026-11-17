import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { SearchRequestError } from "../engine/errors";
import { DatabaseError, NotFoundError, ValidationError } from "../electron/errors";
import { toFailure } from "../electron/ipc/to-result";

describe("toFailure (errors crossing the IPC boundary)", () => {
    const quiet: unknown[][] = [];
    const log = (...a: unknown[]) => quiet.push(a);

    it("passes validation errors through with their field messages", () => {
        const r = toFailure(new ValidationError({ name: "Give the investigation a name." }), log);
        assert.deepEqual(r, { ok: false, error: { code: "VALIDATION", message: "Some details need fixing.", fields: { name: "Give the investigation a name." } } });
    });
    it("maps invalid search requests to VALIDATION", () => {
        const r = toFailure(new SearchRequestError({ username: "bad" }), log);
        assert.equal(r.ok === false && r.error.code, "VALIDATION");
    });
    it("reports NOT_FOUND without leaking ids", () => {
        const r = toFailure(new NotFoundError("Investigation", "11111111-secret"), log);
        assert.equal(r.ok === false && r.error.code, "NOT_FOUND");
        assert.ok(!JSON.stringify(r).includes("secret"));
    });
    it("logs but never returns database internals", () => {
        quiet.length = 0;
        const r = toFailure(new DatabaseError(new Error("SQLITE_CORRUPT at /Users/bob/tracepoint.db")), log);
        assert.ok(!JSON.stringify(r).includes("bob"));
        assert.ok(!JSON.stringify(r).includes("SQLITE"));
        assert.equal(quiet.length, 1);
    });
    it("turns unknown throwables into a generic INTERNAL error", () => {
        quiet.length = 0;
        for (const thrown of [new Error("stack trace here"), "a string", null]) {
            const r = toFailure(thrown, log);
            assert.equal(r.ok, false);
            if (!r.ok) {
                assert.equal(r.error.code, "INTERNAL");
                assert.equal(r.error.message, "Something went wrong. Please try again.");
            }
        }
        assert.equal(quiet.length, 3);
    });
});
