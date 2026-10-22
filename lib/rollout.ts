export type Status = "Proposed" | "Pilot" | "Limited" | "Live" | "Paused" | "Retired";
export type Stage = "Pilot" | "Limited" | "Live";
export type Tier = "Low" | "Medium" | "High";
export type Role = "Team lead" | "Security" | "Legal and compliance";

export const STAGES: Stage[] = ["Pilot", "Limited", "Live"];
export const RAIL: Status[] = ["Proposed", "Pilot", "Limited", "Live"];

export const AUTONOMY = ["Suggests only", "Drafts for review", "Acts with approval", "Acts on its own"] as const;
export type Autonomy = (typeof AUTONOMY)[number];

export const DATA_CLASSES = ["Public", "Internal", "Confidential", "Regulated"] as const;
export type DataClass = (typeof DATA_CLASSES)[number];

export type Agent = {
  id: string;
  name: string;
  team: string;
  owner: string | null;
  purpose: string;
  status: Status;
  autonomy: Autonomy;
  /** The most sensitive class of data the agent can read. */
  data: DataClass;
  customerFacing: boolean;
  monthlyRuns: number;
  monthlyCost: number;
  /** Zero means no budget has been set. */
  monthlyBudget: number;
  daysSinceReview: number;
  dataReviewed: boolean;
  evalPassed: boolean;
  logging: boolean;
  humanFallback: boolean;
  incidentContact: boolean;
};

export const REVIEW_INTERVAL_DAYS = 90;

export type Risk = { score: number; tier: Tier; reasons: string[] };

export function riskOf(agent: Agent): Risk {
  const a = AUTONOMY.indexOf(agent.autonomy);
  const d = DATA_CLASSES.indexOf(agent.data);
  const c = agent.customerFacing ? 2 : 0;
  const reasons = [
    `Autonomy: ${agent.autonomy} (+${a})`,
    `Data it can read: ${agent.data} (+${d})`,
    agent.customerFacing ? "Customer-facing (+2)" : "Internal use only (+0)",
  ];
  const score = a + d + c;
  const tier: Tier = score >= 5 ? "High" : score >= 3 ? "Medium" : "Low";
  return { score, tier, reasons };
}

export function nextStage(status: Status): Stage | null {
  if (status === "Proposed") return "Pilot";
  if (status === "Pilot") return "Limited";
  if (status === "Limited") return "Live";
  return null;
}

export type Gate = { id: string; label: string; met: boolean; fix: string };

/** Checks that must pass before an agent can enter the target stage. */
export function gatesFor(agent: Agent, target: Stage): Gate[] {
  const gates: Gate[] = [
    { id: "owner", label: "Named owner", met: !!agent.owner && agent.owner.trim().length > 0, fix: "Assign an owner." },
    { id: "dataReviewed", label: "Data access reviewed", met: agent.dataReviewed, fix: "Review what data the agent can read." },
    { id: "budget", label: "Monthly budget set", met: agent.monthlyBudget > 0, fix: "Set a monthly budget." },
  ];
  if (target === "Limited" || target === "Live") {
    gates.push(
      { id: "eval", label: "Evaluation passed", met: agent.evalPassed, fix: "Run the agent's test cases and pass them." },
      { id: "logging", label: "Logging and audit trail on", met: agent.logging, fix: "Turn on logging for every action." },
      { id: "fallback", label: "Human fallback defined", met: agent.humanFallback, fix: "Name who takes over when the agent fails." }
    );
  }
  if (target === "Live") {
    gates.push(
      { id: "incident", label: "Incident contact named", met: agent.incidentContact, fix: "Name who is called when something goes wrong." },
      {
        id: "recentReview",
        label: `Reviewed in the last ${REVIEW_INTERVAL_DAYS} days`,
        met: agent.daysSinceReview <= REVIEW_INTERVAL_DAYS,
        fix: "Hold a review before going live.",
      }
    );
  }
  return gates;
}

/** Higher risk means more people must sign off. */
export function requiredRoles(tier: Tier, target: Stage): Role[] {
  if (tier === "Low") return ["Team lead"];
  if (tier === "Medium") return target === "Pilot" ? ["Team lead"] : ["Team lead", "Security"];
  return target === "Pilot" ? ["Team lead", "Security"] : ["Team lead", "Security", "Legal and compliance"];
}

export type Signoffs = Partial<Record<Role, "approved" | "rejected">>;

export type RequestState = "rejected" | "blocked" | "waiting" | "ready";

export type Assessment = {
  tier: Tier;
  gates: Gate[];
  unmet: Gate[];
  roles: Role[];
  approved: Role[];
  rejected: Role[];
  pending: Role[];
  state: RequestState;
};

/** A rejection beats a missing check, a missing check beats a missing sign-off. */
export function assess(agent: Agent, target: Stage, signoffs: Signoffs): Assessment {
  const { tier } = riskOf(agent);
  const gates = gatesFor(agent, target);
  const unmet = gates.filter((g) => !g.met);
  const roles = requiredRoles(tier, target);
  const approved = roles.filter((r) => signoffs[r] === "approved");
  const rejected = roles.filter((r) => signoffs[r] === "rejected");
  const pending = roles.filter((r) => !signoffs[r]);
  const state: RequestState =
    rejected.length > 0 ? "rejected" : unmet.length > 0 ? "blocked" : pending.length > 0 ? "waiting" : "ready";
  return { tier, gates, unmet, roles, approved, rejected, pending, state };
}

/** Stages cannot be skipped. Returns the updated agent, or null if the move is not allowed. */
export function advance(agent: Agent, target: Stage, signoffs: Signoffs): Agent | null {
  if (nextStage(agent.status) !== target) return null;
  if (assess(agent, target, signoffs).state !== "ready") return null;
  return { ...agent, status: target, daysSinceReview: 0 };
}

export type Issue = { agentId: string; agent: string; kind: string; detail: string };

const ACTIVE: Status[] = ["Pilot", "Limited", "Live"];

/** Things a program manager would chase this week. */
export function attention(agents: Agent[]): Issue[] {
  const out: Issue[] = [];
  for (const a of agents) {
    if (a.status === "Retired") continue;
    const add = (kind: string, detail: string) => out.push({ agentId: a.id, agent: a.name, kind, detail });

    if (!a.owner || a.owner.trim() === "") add("No owner", "Nobody is accountable for this agent.");
    if (ACTIVE.includes(a.status) && a.monthlyBudget === 0 && a.monthlyCost > 0) {
      add("No budget", `Spends $${a.monthlyCost.toLocaleString("en-US")} a month with no budget set.`);
    }
    if (a.monthlyBudget > 0 && a.monthlyCost > a.monthlyBudget) {
      const over = a.monthlyCost - a.monthlyBudget;
      add("Over budget", `$${over.toLocaleString("en-US")} over its $${a.monthlyBudget.toLocaleString("en-US")} budget.`);
    }
    if (ACTIVE.includes(a.status) && a.daysSinceReview > REVIEW_INTERVAL_DAYS) {
      add("Review overdue", `Last reviewed ${a.daysSinceReview} days ago. The limit is ${REVIEW_INTERVAL_DAYS}.`);
    }
    if (ACTIVE.includes(a.status) && riskOf(a).tier === "High" && !a.humanFallback) {
      add("High risk, no fallback", "A high-risk agent is running without a named human fallback.");
    }
  }
  return out;
}

export type Summary = {
  byStatus: Record<Status, number>;
  byTier: Record<Tier, number>;
  activeCount: number;
  totalCost: number;
  totalBudget: number;
  totalRuns: number;
};

/** Counts everything that is not retired toward cost and budget. */
export function summarize(agents: Agent[]): Summary {
  const byStatus: Record<Status, number> = { Proposed: 0, Pilot: 0, Limited: 0, Live: 0, Paused: 0, Retired: 0 };
  const byTier: Record<Tier, number> = { Low: 0, Medium: 0, High: 0 };
  let totalCost = 0;
  let totalBudget = 0;
  let totalRuns = 0;
  let activeCount = 0;
  for (const a of agents) {
    byStatus[a.status] += 1;
    if (a.status === "Retired") continue;
    byTier[riskOf(a).tier] += 1;
    activeCount += 1;
    totalCost += a.monthlyCost;
    totalBudget += a.monthlyBudget;
    totalRuns += a.monthlyRuns;
  }
  return { byStatus, byTier, activeCount, totalCost, totalBudget, totalRuns };
}

const base = {
  dataReviewed: true,
  evalPassed: true,
  logging: true,
  humanFallback: true,
  incidentContact: true,
  customerFacing: false,
};

/** Synthetic agents for a made-up company. */
export const SAMPLE_AGENTS: Agent[] = [
  { ...base, id: "a1", name: "Invoice Matcher", team: "Finance Operations", owner: "Priya N.", purpose: "Matches supplier invoices to purchase orders and flags mismatches.", status: "Live", autonomy: "Acts with approval", data: "Confidential", monthlyRuns: 12400, monthlyCost: 930, monthlyBudget: 1200, daysSinceReview: 40 },
  { ...base, id: "a2", name: "Support Reply Drafter", team: "Customer Support", owner: "Marcus T.", purpose: "Drafts replies to customer tickets for an agent to edit and send.", status: "Live", autonomy: "Drafts for review", data: "Internal", customerFacing: true, monthlyRuns: 48000, monthlyCost: 2100, monthlyBudget: 2000, daysSinceReview: 75 },
  { ...base, id: "a3", name: "Contract Clause Finder", team: "Legal Operations", owner: "Elena R.", purpose: "Finds and highlights standard clauses in vendor contracts.", status: "Limited", autonomy: "Suggests only", data: "Confidential", monthlyRuns: 3200, monthlyCost: 410, monthlyBudget: 500, daysSinceReview: 20 },
  { ...base, id: "a4", name: "Onboarding Buddy", team: "People Operations", owner: null, purpose: "Answers new-hire questions and drafts first-week checklists.", status: "Pilot", autonomy: "Drafts for review", data: "Confidential", monthlyRuns: 800, monthlyCost: 120, monthlyBudget: 300, daysSinceReview: 30, evalPassed: false, incidentContact: false },
  { ...base, id: "a5", name: "Refund Approver", team: "Customer Support", owner: "Marcus T.", purpose: "Approves small refund requests without a person in the loop.", status: "Pilot", autonomy: "Acts on its own", data: "Confidential", customerFacing: true, monthlyRuns: 900, monthlyCost: 260, monthlyBudget: 400, daysSinceReview: 14, evalPassed: false, humanFallback: false, incidentContact: false },
  { ...base, id: "a6", name: "Meeting Notes Summarizer", team: "Company-wide", owner: "Sam K.", purpose: "Summarizes recorded meetings and lists action items.", status: "Live", autonomy: "Suggests only", data: "Internal", monthlyRuns: 9000, monthlyCost: 640, monthlyBudget: 600, daysSinceReview: 130 },
  { ...base, id: "a7", name: "Vendor Risk Screener", team: "Procurement", owner: "Dana W.", purpose: "Screens new vendors against a risk checklist before onboarding.", status: "Proposed", autonomy: "Acts with approval", data: "Confidential", monthlyRuns: 0, monthlyCost: 0, monthlyBudget: 0, daysSinceReview: 5, dataReviewed: false, evalPassed: false, logging: false, incidentContact: false },
  { ...base, id: "a8", name: "Code Review Helper", team: "Engineering", owner: "Lee Q.", purpose: "Suggests fixes and style changes on pull requests.", status: "Live", autonomy: "Suggests only", data: "Confidential", monthlyRuns: 22000, monthlyCost: 1500, monthlyBudget: 1800, daysSinceReview: 55 },
  { ...base, id: "a9", name: "Churn Alert Agent", team: "Sales Operations", owner: "Hana B.", purpose: "Watches usage drops and drafts outreach for account managers.", status: "Limited", autonomy: "Acts with approval", data: "Confidential", monthlyRuns: 2600, monthlyCost: 340, monthlyBudget: 500, daysSinceReview: 25 },
  { ...base, id: "a10", name: "Expense Policy Checker", team: "Finance Operations", owner: "Priya N.", purpose: "Checks expense reports against policy before approval.", status: "Paused", autonomy: "Suggests only", data: "Internal", monthlyRuns: 0, monthlyCost: 0, monthlyBudget: 400, daysSinceReview: 60 },
  { ...base, id: "a11", name: "Legacy FAQ Bot", team: "Customer Support", owner: "Marcus T.", purpose: "Answered website FAQs. Replaced by the support drafter.", status: "Retired", autonomy: "Suggests only", data: "Public", customerFacing: true, monthlyRuns: 0, monthlyCost: 0, monthlyBudget: 0, daysSinceReview: 200 },
];

export type OpenRequest = { id: string; agentId: string; to: Stage; signoffs: Signoffs };

/** Requests already in flight when the page loads. */
export const SAMPLE_REQUESTS: OpenRequest[] = [
  { id: "q1", agentId: "a5", to: "Limited", signoffs: { "Team lead": "approved" } },
  { id: "q2", agentId: "a9", to: "Live", signoffs: { "Team lead": "approved" } },
];
