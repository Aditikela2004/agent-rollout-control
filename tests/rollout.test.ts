import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLE_AGENTS,
  SAMPLE_REQUESTS,
  riskOf,
  nextStage,
  gatesFor,
  requiredRoles,
  assess,
  advance,
  attention,
  summarize,
  type Agent,
} from "../lib/rollout";

const byId = (id: string) => SAMPLE_AGENTS.find((a) => a.id === id)!;

const clean: Agent = {
  id: "t",
  name: "Test agent",
  team: "Test",
  owner: "Ada L.",
  purpose: "Test",
  status: "Pilot",
  autonomy: "Suggests only",
  data: "Internal",
  customerFacing: false,
  monthlyRuns: 100,
  monthlyCost: 50,
  monthlyBudget: 100,
  daysSinceReview: 10,
  dataReviewed: true,
  evalPassed: true,
  logging: true,
  humanFallback: true,
  incidentContact: true,
};

test("risk score adds autonomy, data class and customer exposure", () => {
  assert.equal(riskOf({ ...clean }).score, 1); // 0 + 1 + 0
  assert.equal(riskOf({ ...clean, autonomy: "Acts on its own", data: "Regulated", customerFacing: true }).score, 8);
});

test("risk tier boundaries: 2 is Low, 3 is Medium, 4 is Medium, 5 is High", () => {
  const withScore = (autonomy: Agent["autonomy"], data: Agent["data"], cf: boolean) =>
    riskOf({ ...clean, autonomy, data, customerFacing: cf }).tier;
  assert.equal(withScore("Suggests only", "Confidential", false), "Low"); // 2
  assert.equal(withScore("Drafts for review", "Confidential", false), "Medium"); // 3
  assert.equal(withScore("Acts with approval", "Confidential", false), "Medium"); // 4
  assert.equal(withScore("Acts with approval", "Confidential", true) , "High"); // 6
  assert.equal(withScore("Acts on its own", "Internal", false), "Medium"); // 4
  assert.equal(withScore("Drafts for review", "Confidential", true), "High"); // 5
});

test("risk explains itself with one reason per factor", () => {
  assert.equal(riskOf(byId("a5")).reasons.length, 3);
  assert.equal(riskOf(byId("a5")).tier, "High");
});

test("stages move one step at a time and stop at Live", () => {
  assert.equal(nextStage("Proposed"), "Pilot");
  assert.equal(nextStage("Pilot"), "Limited");
  assert.equal(nextStage("Limited"), "Live");
  assert.equal(nextStage("Live"), null);
  assert.equal(nextStage("Paused"), null);
  assert.equal(nextStage("Retired"), null);
});

test("later stages need more checks", () => {
  assert.equal(gatesFor(clean, "Pilot").length, 3);
  assert.equal(gatesFor(clean, "Limited").length, 6);
  assert.equal(gatesFor(clean, "Live").length, 8);
});

test("an empty owner name fails the owner check", () => {
  const gate = (o: string | null) => gatesFor({ ...clean, owner: o }, "Pilot").find((g) => g.id === "owner")!;
  assert.equal(gate(null).met, false);
  assert.equal(gate("   ").met, false);
  assert.equal(gate("Ada L.").met, true);
});

test("a budget of zero fails the budget check", () => {
  const g = gatesFor({ ...clean, monthlyBudget: 0 }, "Pilot").find((x) => x.id === "budget")!;
  assert.equal(g.met, false);
});

test("the review check allows exactly 90 days and fails at 91", () => {
  const met = (days: number) =>
    gatesFor({ ...clean, daysSinceReview: days }, "Live").find((g) => g.id === "recentReview")!.met;
  assert.equal(met(90), true);
  assert.equal(met(91), false);
});

test("higher risk needs more sign-offs", () => {
  assert.deepEqual(requiredRoles("Low", "Live"), ["Team lead"]);
  assert.deepEqual(requiredRoles("Medium", "Pilot"), ["Team lead"]);
  assert.deepEqual(requiredRoles("Medium", "Live"), ["Team lead", "Security"]);
  assert.deepEqual(requiredRoles("High", "Pilot"), ["Team lead", "Security"]);
  assert.deepEqual(requiredRoles("High", "Limited"), ["Team lead", "Security", "Legal and compliance"]);
});

test("the Refund Approver request is blocked by missing checks, not by missing sign-offs", () => {
  const q = SAMPLE_REQUESTS.find((r) => r.id === "q1")!;
  const result = assess(byId(q.agentId), q.to, q.signoffs);
  assert.equal(result.state, "blocked");
  assert.deepEqual(result.unmet.map((g) => g.id).sort(), ["eval", "fallback"]);
  assert.deepEqual(result.pending, ["Security", "Legal and compliance"]);
});

test("the Churn Alert request waits for Security", () => {
  const q = SAMPLE_REQUESTS.find((r) => r.id === "q2")!;
  const result = assess(byId(q.agentId), q.to, q.signoffs);
  assert.equal(result.state, "waiting");
  assert.deepEqual(result.pending, ["Security"]);
  assert.deepEqual(result.approved, ["Team lead"]);
});

test("a rejection beats a missing check", () => {
  const result = assess(byId("a5"), "Limited", { Security: "rejected" });
  assert.equal(result.state, "rejected");
});

test("a request is ready only when every check passes and every role has approved", () => {
  const agent = byId("a9");
  assert.equal(assess(agent, "Live", { "Team lead": "approved", Security: "approved" }).state, "ready");
  assert.equal(assess(agent, "Live", { "Team lead": "approved" }).state, "waiting");
});

test("advance moves a ready agent forward and resets its review clock", () => {
  const moved = advance(byId("a9"), "Live", { "Team lead": "approved", Security: "approved" });
  assert.ok(moved);
  assert.equal(moved!.status, "Live");
  assert.equal(moved!.daysSinceReview, 0);
});

test("advance refuses when sign-offs are missing or a stage would be skipped", () => {
  assert.equal(advance(byId("a9"), "Live", { "Team lead": "approved" }), null);
  const proposed = { ...clean, status: "Proposed" as const };
  assert.equal(advance(proposed, "Live", { "Team lead": "approved" }), null);
});

test("advance does not change the agent it was given", () => {
  const agent = byId("a9");
  advance(agent, "Live", { "Team lead": "approved", Security: "approved" });
  assert.equal(agent.status, "Limited");
});

test("attention finds the expected issues in the sample fleet", () => {
  const issues = attention(SAMPLE_AGENTS);
  const kinds = issues.map((i) => `${i.agent}: ${i.kind}`).sort();
  assert.deepEqual(kinds, [
    "Meeting Notes Summarizer: Over budget",
    "Meeting Notes Summarizer: Review overdue",
    "Onboarding Buddy: No owner",
    "Refund Approver: High risk, no fallback",
    "Support Reply Drafter: Over budget",
  ]);
});

test("attention ignores retired agents even when they have problems", () => {
  const retired = { ...clean, status: "Retired" as const, owner: null, monthlyCost: 500, monthlyBudget: 10 };
  assert.deepEqual(attention([retired]), []);
});

test("an agent spending with no budget is flagged", () => {
  const issues = attention([{ ...clean, monthlyBudget: 0, monthlyCost: 300 }]);
  assert.ok(issues.some((i) => i.kind === "No budget"));
});

test("summary counts agree with the sample fleet", () => {
  const s = summarize(SAMPLE_AGENTS);
  assert.equal(s.byStatus.Live, 4);
  assert.equal(s.byStatus.Retired, 1);
  assert.equal(s.activeCount, 10);
  assert.equal(s.byTier.Low + s.byTier.Medium + s.byTier.High, s.activeCount);
  assert.equal(s.totalCost, 6300);
  assert.equal(s.totalBudget, 7700);
  assert.equal(s.totalRuns, 98900);
});

test("an empty fleet gives zeroes", () => {
  const s = summarize([]);
  assert.equal(s.activeCount, 0);
  assert.equal(s.totalCost, 0);
  assert.deepEqual(attention([]), []);
});
