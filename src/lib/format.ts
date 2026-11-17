export function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
