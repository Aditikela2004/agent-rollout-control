# Agent Rollout Control Center

A concept project: one board for every AI agent a company runs, showing who owns it, what it costs, how risky it is, and what has to be true before it moves from pilot to live.

**This is a portfolio concept using synthetic data.** The company, teams, people, and numbers are made up. The risk scoring and the stage gates are illustrative and are not an industry standard or any company's policy.

## Screens
1. Fleet: eleven agents shown as strips on a board. Each strip has a risk tab, runs per month, cost against budget, days since review, and a four-stop stage rail. Filter by stage, team, or risk tier. Select a strip to see why it has its risk tier, edit its facts (owner, budget, autonomy, data it reads, and the readiness checks), and request its next stage.
2. Approvals: open requests to move an agent forward. Each shows which checks are met, which roles still have to sign off, and a Move button that stays disabled until everything is in place. An activity list records what you do.
3. Overview: active agents, monthly runs, open requests, cost against budget, stage and risk mix, and a "needs attention" list with a link back to each agent.

## How it works
- **Risk tier:** a score from three factors. Autonomy (0 to 3), the most sensitive data the agent reads (0 to 3), and whether it faces customers (+2). A score of 5 or more is High, 3 to 4 is Medium, and 0 to 2 is Low.
- **Stages:** Proposed, Pilot, Limited, Live. Stages cannot be skipped. Paused and Retired sit outside the flow.
- **Checks:** later stages need more. Pilot needs an owner, a data review, and a budget. Limited adds a passed evaluation, logging, and a human fallback. Live adds an incident contact and a review within 90 days.
- **Sign-offs:** higher risk needs more roles. Low risk needs the team lead. Medium needs the team lead and Security, except at Pilot. High needs the team lead, Security, and Legal and compliance, except at Pilot where Legal is not required.
- **Request state:** a rejection beats an open check, an open check beats a missing sign-off. A request is ready only when every check is met and every required role has approved.
- **Attention list:** no owner, no budget while spending, over budget, review overdue, and a high-risk agent running without a fallback. Retired agents are ignored.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000. No API key or environment variable is needed.

## Tests
```bash
npm test
```
Twenty-one tests cover risk tier boundaries, stage order, the checks at each stage, the 90-day review boundary, sign-off requirements by tier, request states and their precedence, advancing without mutating the agent, the attention list, and the fleet summary.

## Deploy to Vercel
1. Put this folder in its own GitHub repository.
2. In Vercel, choose Add New, then Project, and import the repository. Framework preset: Next.js.
3. Click Deploy. There are no environment variables to set.

## Project layout
- `lib/rollout.ts`: risk scoring, checks, sign-offs, request logic, attention list, summary, sample fleet
- `app/page.tsx`: the three screens
- `tests/rollout.test.ts`: unit tests
- `docs/`: problem brief and case study draft

## Known limits
- All state lives in the page. Refreshing resets the fleet and the requests.
- Sign-offs are buttons, not real identities. There are no accounts or roles.
- Cost, usage, and review data are typed in, not pulled from a real system.
- The scoring weights and gates are a starting point that a real team would set with security and legal.
- No users have tested this, so it makes no claims about time saved or incidents avoided.
