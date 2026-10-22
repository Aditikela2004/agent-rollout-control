# Problem brief: Agent Rollout Control Center

Concept project, synthetic data only.

## Problem
Teams are building AI agents faster than anyone is tracking them. Without one list, nobody can say how many agents exist, who owns each one, what they cost, or which ones can act without a person checking. Moving an agent from pilot to live then depends on whoever happens to ask the right questions.

## Users
- **Program or implementation manager:** needs one view of the fleet, a repeatable path from pilot to live, and a short list of what needs chasing this week.
- **Approvers (team lead, security, legal and compliance):** need to see what they are signing off on and whether the basics are already in place.
- **Agent owner:** needs to know exactly what is missing before a request can move.

## Goals
1. Give every agent an owner, a budget, and a risk tier.
2. Make the checks for each stage explicit, so a request is blocked for a stated reason and not by opinion.
3. Ask for more sign-offs as risk goes up, and fewer when it is low.
4. Surface problems (no owner, over budget, overdue review) without anyone having to go looking.

## Scope of this concept
- Eleven synthetic agents across a made-up company.
- A risk score from autonomy, data sensitivity, and customer exposure.
- Four stages with checks that grow at each stage.
- A sign-off flow by role, with a rejection that stops a request.
- An overview with cost against budget and a needs-attention list.

## Out of scope
- Real agent discovery or integrations with cloud or billing systems.
- Accounts, permissions, or a stored audit trail.
- Monitoring an agent's behavior after it goes live.

## Measures to collect once real teams use something like this
These are measures to track, not results.
- Share of agents with a named owner and a budget.
- Time from a pilot request to a decision, and how often requests are blocked for the same reason.
- Number of agents running past their review date.
- Share of spend that has no budget attached.

## Open questions
- Who sets the risk weights, and how often are they reviewed?
- Should a failed evaluation automatically pause a live agent?
- How should shared agents with several owners be handled?
