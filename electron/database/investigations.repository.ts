import { randomUUID } from "node:crypto";
import type { Database } from "./index";
import { DatabaseError, NotFoundError, TracepointError, ValidationError } from "../errors";
import type { Investigation, InvestigationStatus } from "../../shared/types/investigation";
import type { PlatformId } from "../../shared/platforms";
import { validateCreateInvestigation, validateUpdateInvestigation } from "../../shared/validation";

interface InvestigationRow {
    id: string;
    name: string;
    username: string;
    platform: string;
    status: string;
    created_at: string;
    updated_at: string;
}

const toInvestigation = (row: InvestigationRow): Investigation => ({
    id: row.id,
    name: row.name,
    username: row.username,
    platform: row.platform as PlatformId,
    status: row.status as InvestigationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

/** Columns a caller may change, mapped to their SQL names. Allow-list, never user input. */
const UPDATABLE = { name: "name", username: "username", platform: "platform", status: "status" } as const;

export class InvestigationRepository {
    constructor(
        private readonly db: Database,
        private readonly now: () => Date = () => new Date(),
    ) {}

    create(input: unknown): Investigation {
        const parsed = validateCreateInvestigation(input);
        if (!parsed.ok) throw new ValidationError(parsed.fields);
        const { name, username, platform, status } = parsed.value;

        const timestamp = this.now().toISOString();
        const id = randomUUID();
        return this.guard(() => {
            this.db
                .prepare(
                    `INSERT INTO investigations (id, name, username, platform, status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                )
                .run(id, name, username, platform, status, timestamp, timestamp);
            return this.mustGet(id);
        });
    }

    /** Most recently updated first. */
    getAll(): Investigation[] {
        return this.guard(() =>
            (this.db
                .prepare("SELECT * FROM investigations ORDER BY updated_at DESC, created_at DESC, id")
                .all() as unknown as InvestigationRow[]).map(toInvestigation),
        );
    }

    getById(id: string): Investigation {
        return this.guard(() => this.mustGet(id));
    }

    update(id: string, patch: unknown): Investigation {
        const parsed = validateUpdateInvestigation(patch);
        if (!parsed.ok) throw new ValidationError(parsed.fields);

        const entries = Object.entries(parsed.value) as [keyof typeof UPDATABLE, string][];
        const assignments = entries.map(([key]) => `${UPDATABLE[key]} = ?`);
        const values = entries.map(([, value]) => value);

        return this.guard(() => {
            const result = this.db
                .prepare(`UPDATE investigations SET ${assignments.join(", ")}, updated_at = ? WHERE id = ?`)
                .run(...values, this.now().toISOString(), id);
            if (result.changes === 0) throw new NotFoundError("Investigation", id);
            return this.mustGet(id);
        });
    }

    delete(id: string): void {
        this.guard(() => {
            const result = this.db.prepare("DELETE FROM investigations WHERE id = ?").run(id);
            if (result.changes === 0) throw new NotFoundError("Investigation", id);
        });
    }

    private mustGet(id: string): Investigation {
        const row = this.db.prepare("SELECT * FROM investigations WHERE id = ?").get(id) as unknown as
            | InvestigationRow
            | undefined;
        if (!row) throw new NotFoundError("Investigation", id);
        return toInvestigation(row);
    }

    /** Lets our own typed errors through; wraps anything else (SQLite failures) in DatabaseError. */
    private guard<T>(fn: () => T): T {
        try {
            return fn();
        } catch (error) {
            if (error instanceof TracepointError) throw error;
            throw new DatabaseError(error);
        }
    }
}
