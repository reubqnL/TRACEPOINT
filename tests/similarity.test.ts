import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeConfidence } from "../engine/confidence";
import { compareUsernames, levenshtein } from "../engine/similarity";

describe("compareUsernames", () => {
    it("identical names are exact", () => {
        assert.deepEqual(compareUsernames("octocat", "octocat"), { kind: "exact", similarity: 1, caseDiffers: false });
    });
    it("names differing only by case are exact but flagged", () => {
        assert.deepEqual(compareUsernames("Octocat", "octocat"), { kind: "exact", similarity: 1, caseDiffers: true });
    });
    it("ignores a leading @ and surrounding space", () => {
        assert.equal(compareUsernames(" @octocat ", "octocat").kind, "exact");
    });
    it("treats separator differences as similar", () => {
        for (const c of ["john_doe", "john.doe", "johndoe", "john-doe"]) {
            const r = compareUsernames("john_doe", c);
            assert.equal(r.kind, c === "john_doe" ? "exact" : "similar", c);
        }
        assert.equal(compareUsernames("john_doe", "johndoe").similarity, 0.95);
    });
    it("accepts near misses at or above the threshold, rejects below", () => {
        assert.equal(compareUsernames("octocat", "octocats").kind, "similar"); // 1 edit / 8
        assert.equal(compareUsernames("alice", "alic3").kind, "similar"); // exactly 0.8
        assert.equal(compareUsernames("alice", "bob").kind, "none");
        assert.equal(compareUsernames("octocat", "octodog").kind, "none");
    });
    it("never reports short, mostly different names as similar", () => {
        assert.equal(compareUsernames("bob", "bobby").kind, "none");
        assert.equal(compareUsernames("ab1", "ab2").kind, "none");
    });
    it("handles empty and unicode input", () => {
        assert.equal(compareUsernames("", "x").kind, "none");
        assert.equal(compareUsernames("ｕｓｅｒ", "user").kind, "exact"); // NFKC
    });
    it("levenshtein is correct", () => {
        assert.equal(levenshtein("kitten", "sitting"), 3);
        assert.equal(levenshtein("", "abc"), 3);
        assert.equal(levenshtein("same", "same"), 0);
    });
});

describe("computeConfidence", () => {
    it("ranks exact above case-differing exact above any similar", () => {
        const exact = computeConfidence({ kind: "exact", similarity: 1, caseDiffers: false });
        const cased = computeConfidence({ kind: "exact", similarity: 1, caseDiffers: true });
        const best = computeConfidence({ kind: "similar", similarity: 0.99, caseDiffers: false });
        assert.ok(exact > cased && cased > best);
        assert.ok(best <= 0.89);
        assert.equal(computeConfidence({ kind: "none", similarity: 0.1, caseDiffers: false }), 0);
    });
});
