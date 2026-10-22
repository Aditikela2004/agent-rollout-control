# Case study draft: Agent Rollout Control Center

Fill in the bracketed parts from your own experience before publishing. Nothing here claims results the project has not produced.

## One-line summary
A concept board that tracks every AI agent a company runs and puts a clear, risk-based approval path between pilot and live.

## Why I built it
[Add 2 to 3 sentences in your own words. You could draw on coordinating stakeholder requests and prioritization on RBL Bank's IT HR team, or on your IT governance, risk and compliance work, and the lesson that people follow a process when the next step is obvious. Use only things you actually observed.]

## The problem
Agents are easy to start and hard to keep track of. Without one list, nobody knows how many exist, who owns them, what they cost, or which can act on their own. Moving to production then depends on who asks the right questions.

## What I built
- A fleet board of eleven synthetic agents with a risk tab, cost against budget, days since review, and a four-stop stage rail on each strip.
- A risk tier built from autonomy, the data an agent can read, and customer exposure, with the reasons shown.
- Stage gates that grow as an agent moves toward live.
- A sign-off flow where higher-risk agents need more roles to approve.
- An overview with cost against budget, stage and risk mix, and a needs-attention list.

## Decisions and tradeoffs
1. **Show the reasons behind the risk tier.** A tier with no explanation invites argument. Showing the three factors lets an owner see what to change, such as moving an agent from "acts on its own" to "acts with approval". The weakness is that a simple sum treats the factors as equal, and a real team would weigh them.
2. **Checks first, sign-offs second.** A request with open checks shows as blocked and tells the owner what to fix. Asking approvers to review something that cannot pass wastes their time. The tradeoff is that approvers cannot record an early view.
3. **More sign-offs for higher risk, fewer for Pilot.** Low-risk agents need only the team lead. Pilots need less than later stages, because the aim of a pilot is to learn. This keeps low-risk work moving. The risk is that a pilot touches real data, so even a Medium pilot depends on the data review gate.
4. **No skipped stages.** Each stage adds checks, so jumping from Proposed to Live would skip evidence. The cost is that urgent agents cannot be fast-tracked in this version.
5. **A needs-attention list instead of a long report.** The program manager's weekly job is chasing exceptions. Five rules (no owner, no budget, over budget, overdue review, high risk with no fallback) cover the first things to chase.

## What the sample fleet shows
Of the 10 non-retired agents, 1 is High risk, 5 are Medium, and 4 are Low. Five issues are flagged across four agents, and two requests are open: one blocked by two open checks and one waiting for a Security sign-off. These come from made-up data and say nothing about real companies.

## What I tested
- Twenty-one unit tests: risk tier boundaries, stage order, checks at each stage, the 90-day review boundary, sign-offs by tier, request states and their precedence, advancing without changing the original agent, the attention list, and the summary.
- A production build and a click-through of all three screens in a headless browser, including approving a request and moving an agent to Live.

## What I have not tested yet
- No real users, so no claims about time saved or incidents avoided.
- The scoring weights and gates have not been reviewed by security or legal staff.
- Sign-offs are buttons, not real identities.

## What I would do next
1. Ask 3 to 5 people who manage platforms or governance to set up their own fleet and tell me which checks they would add or drop.
2. Pull cost and usage from a real or mock billing feed instead of typed-in numbers.
3. Add an audit trail with who approved what and when.
4. Pause a live agent automatically when its evaluation fails.

## Skills shown
Program and governance design, stage-gate and approval workflows, risk scoring, stakeholder mapping by role, prototyping, testing, and deployment.

## Links
- Live demo: [add Vercel URL after deploy]
- Code: [add GitHub URL]
