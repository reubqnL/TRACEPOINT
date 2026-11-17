import type { PlatformId } from "../platforms";

/* -------------------------------------------------------------------------- */
/*  Investigation (implemented)                                               */
/* -------------------------------------------------------------------------- */

export const INVESTIGATION_STATUSES = ["active", "completed", "paused"] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

/**
 * An investigation as seen by the renderer and returned over IPC.
 * Timestamps are ISO-8601 UTC strings (e.g. "2026-11-16T09:30:00.000Z"),
 * which sort correctly as text and survive JSON/IPC unchanged.
 */
export interface Investigation {
    /** UUID v4, generated in the main process. */
    id: string;
    name: string;
    /** The username being researched, as entered (without a leading "@"). */
    username: string;
    /** Platform the username was originally seen on. */
    platform: PlatformId;
    status: InvestigationStatus;
    createdAt: string;
    updatedAt: string;
}

/** Fields the user supplies when creating an investigation. */
export interface CreateInvestigationInput {
    name: string;
    username: string;
    platform: PlatformId;
    /** Defaults to "active". */
    status?: InvestigationStatus;
}

/** Any subset of the editable fields; at least one is required. */
export type UpdateInvestigationInput = Partial<CreateInvestigationInput>;

/* -------------------------------------------------------------------------- */
/*  Planned (NOT stored yet)                                                  */
/*                                                                            */
/*  These describe the future tables in docs/database.md. They exist so the   */
/*  Investigation shape above is designed against real requirements: each     */
/*  child record points at `investigationId` and is deleted with it           */
/*  (ON DELETE CASCADE). No code reads or writes them yet.                    */
/* -------------------------------------------------------------------------- */

export type MatchKind = "exact" | "similar";
export type MatchReviewState = "new" | "reviewed" | "dismissed";

/** A profile found by a search and saved against an investigation. */
export interface PotentialMatch {
    id: string;
    investigationId: string;
    /** Provider that found it, e.g. "github". */
    platform: PlatformId;
    profileUrl: string;
    username: string;
    matchKind: MatchKind;
    /** Username match strength 0–1 (not identity confidence). */
    confidence: number;
    reviewState: MatchReviewState;
    /** Snapshot of public profile fields at discovery time (JSON). */
    profileSnapshot: Record<string, unknown> | null;
    discoveredAt: string;
}

/** A saved link the investigator wants to come back to. */
export interface Bookmark {
    id: string;
    investigationId: string;
    /** Optional link to the match it was created from. */
    matchId: string | null;
    title: string;
    url: string;
    createdAt: string;
}

/** Free-text note, optionally attached to one match. */
export interface Note {
    id: string;
    investigationId: string;
    matchId: string | null;
    body: string;
    createdAt: string;
    updatedAt: string;
}
