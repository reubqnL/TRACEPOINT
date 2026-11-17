import { PLATFORM_IDS, isPlatformId } from "./platforms";
import type {
    CreateInvestigationInput,
    InvestigationStatus,
    UpdateInvestigationInput,
} from "./types/investigation";
import { INVESTIGATION_STATUSES } from "./types/investigation";

/**
 * Pure validation shared by the renderer (instant form feedback) and the main
 * process (the real gate: the renderer is never trusted).
 */

export const LIMITS = {
    nameMax: 120,
    usernameMax: 100,
    /** Stricter limit for names we actually send to third-party APIs. */
    searchUsernameMax: 64,
} as const;

export type FieldErrors = Record<string, string>;
export type Validated<T> = { ok: true; value: T } | { ok: false; fields: FieldErrors };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Letters, digits and the separators platforms commonly allow. */
const SEARCHABLE_USERNAME = /^[\p{L}\p{N}._-]+$/u;

export function isStatus(value: unknown): value is InvestigationStatus {
    return typeof value === "string" && (INVESTIGATION_STATUSES as readonly string[]).includes(value);
}

export function isValidId(value: unknown): value is string {
    return typeof value === "string" && UUID.test(value);
}

/** Strips surrounding whitespace and one leading "@". */
export function cleanUsername(raw: string): string {
    return raw.trim().replace(/^@/, "");
}

function checkName(raw: unknown, errors: FieldErrors) {
    if (typeof raw !== "string") return void (errors.name = "Name must be text.");
    const value = raw.trim();
    if (!value) errors.name = "Give the investigation a name.";
    else if (value.length > LIMITS.nameMax) errors.name = `Keep the name under ${LIMITS.nameMax} characters.`;
    else if (CONTROL_CHARS.test(value)) errors.name = "Name contains invalid characters.";
    return value;
}

function checkUsername(raw: unknown, errors: FieldErrors) {
    if (typeof raw !== "string") return void (errors.username = "Username must be text.");
    const value = cleanUsername(raw);
    if (!value) errors.username = "Enter the username to research.";
    else if (value.length > LIMITS.usernameMax) errors.username = `Keep the username under ${LIMITS.usernameMax} characters.`;
    else if (/\s/.test(value) || CONTROL_CHARS.test(value)) errors.username = "Usernames cannot contain spaces.";
    return value;
}

function checkPlatform(raw: unknown, errors: FieldErrors) {
    if (!isPlatformId(raw)) errors.platform = `Choose one of: ${PLATFORM_IDS.join(", ")}.`;
    return raw;
}

function checkStatus(raw: unknown, errors: FieldErrors) {
    if (!isStatus(raw)) errors.status = `Status must be one of: ${INVESTIGATION_STATUSES.join(", ")}.`;
    return raw;
}

function asRecord(input: unknown): Record<string, unknown> | null {
    return typeof input === "object" && input !== null && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : null;
}

export function validateCreateInvestigation(input: unknown): Validated<Required<CreateInvestigationInput>> {
    const obj = asRecord(input);
    if (!obj) return { ok: false, fields: { _: "Invalid request." } };

    const errors: FieldErrors = {};
    const known = new Set(["name", "username", "platform", "status"]);
    for (const key of Object.keys(obj)) if (!known.has(key)) errors[key] = "Unknown field.";

    const name = checkName(obj.name, errors);
    const username = checkUsername(obj.username, errors);
    const platform = checkPlatform(obj.platform, errors);
    const status = obj.status === undefined ? "active" : checkStatus(obj.status, errors);

    if (Object.keys(errors).length) return { ok: false, fields: errors };
    return {
        ok: true,
        value: {
            name: name as string,
            username: username as string,
            platform: platform as Required<CreateInvestigationInput>["platform"],
            status: status as InvestigationStatus,
        },
    };
}

export function validateUpdateInvestigation(input: unknown): Validated<UpdateInvestigationInput> {
    const obj = asRecord(input);
    if (!obj) return { ok: false, fields: { _: "Invalid request." } };

    const errors: FieldErrors = {};
    const value: UpdateInvestigationInput = {};
    // `id`, `createdAt` and `updatedAt` are intentionally not editable.
    for (const key of Object.keys(obj)) {
        switch (key) {
            case "name": value.name = checkName(obj.name, errors) as string; break;
            case "username": value.username = checkUsername(obj.username, errors) as string; break;
            case "platform": value.platform = checkPlatform(obj.platform, errors) as UpdateInvestigationInput["platform"]; break;
            case "status": value.status = checkStatus(obj.status, errors) as InvestigationStatus; break;
            default: errors[key] = "This field cannot be updated.";
        }
    }
    if (!Object.keys(obj).length) errors._ = "Nothing to update.";

    return Object.keys(errors).length ? { ok: false, fields: errors } : { ok: true, value };
}

/**
 * Usernames are sent to third-party APIs, so they are held to a tighter
 * standard than the free-form value stored on an investigation: this also
 * prevents query-string/qualifier injection into platform search endpoints.
 */
export function validateSearchUsername(raw: unknown): Validated<string> {
    if (typeof raw !== "string") return { ok: false, fields: { username: "Username must be text." } };
    const value = cleanUsername(raw);
    if (!value) return { ok: false, fields: { username: "Enter a username to search." } };
    if (value.length > LIMITS.searchUsernameMax)
        return { ok: false, fields: { username: `Keep the username under ${LIMITS.searchUsernameMax} characters.` } };
    if (!SEARCHABLE_USERNAME.test(value))
        return { ok: false, fields: { username: "Only letters, numbers, dots, underscores and hyphens can be searched." } };
    return { ok: true, value };
}
