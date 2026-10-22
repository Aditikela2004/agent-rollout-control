"use client";

import { useMemo, useState } from "react";
import {
  AUTONOMY,
  DATA_CLASSES,
  RAIL,
  SAMPLE_AGENTS,
  SAMPLE_REQUESTS,
  advance,
  assess,
  attention,
  gatesFor,
  nextStage,
  riskOf,
  summarize,
  type Agent,
  type OpenRequest,
  type Role,
  type Status,
  type Tier,
} from "../lib/rollout";

type Screen = 1 | 2 | 3;

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const count = (n: number) => n.toLocaleString("en-US");

function Rail({ status }: { status: Status }) {
  const at = RAIL.indexOf(status);
  if (at === -1) return <span className={`chip ${status}`}>{status}</span>;
  return (
    <ol className="rail" aria-label={`Stage: ${status}`}>
      {RAIL.map((s, i) => (
        <li key={s} className={i < at ? "done" : i === at ? "here" : ""}>
          <span className="dot" aria-hidden="true" />
          {s}
        </li>
      ))}
    </ol>
  );
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>(1);
  const [agents, setAgents] = useState<Agent[]>(SAMPLE_AGENTS);
  const [requests, setRequests] = useState<OpenRequest[]>(SAMPLE_REQUESTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [nextId, setNextId] = useState(3);
  const [fStatus, setFStatus] = useState("All");
  const [fTeam, setFTeam] = useState("All");
  const [fTier, setFTier] = useState("All");

  const teams = useMemo(() => ["All", ...Array.from(new Set(agents.map((a) => a.team))).sort()], [agents]);
  const summary = useMemo(() => summarize(agents), [agents]);
  const issues = useMemo(() => attention(agents), [agents]);
  const selected = agents.find((a) => a.id === selectedId) ?? null;

  const visible = agents.filter(
    (a) =>
      (fStatus === "All" || a.status === fStatus) &&
      (fTeam === "All" || a.team === fTeam) &&
      (fTier === "All" || riskOf(a).tier === fTier)
  );

  const say = (line: string) => setLog((l) => [line, ...l].slice(0, 20));
  const patch = (id: string, change: Partial<Agent>) =>
    setAgents((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)));

  function openRequest(a: Agent) {
    const to = nextStage(a.status);
    if (!to || requests.some((r) => r.agentId === a.id)) return;
    setRequests((r) => [...r, { id: `q${nextId}`, agentId: a.id, to, signoffs: {} }]);
    setNextId((n) => n + 1);
    say(`Requested ${a.name}: ${a.status} to ${to}`);
    setScreen(2);
  }

  function signoff(req: OpenRequest, role: Role, call: "approved" | "rejected" | null) {
    const agent = agents.find((a) => a.id === req.agentId)!;
    setRequests((list) =>
      list.map((r) => {
        if (r.id !== req.id) return r;
        const next = { ...r.signoffs };
        if (call) next[role] = call;
        else delete next[role];
        return { ...r, signoffs: next };
      })
    );
    say(call ? `${role} ${call === "approved" ? "approved" : "rejected"} ${agent.name} to ${req.to}` : `${role} cleared on ${agent.name}`);
  }

  function promote(req: OpenRequest) {
    const agent = agents.find((a) => a.id === req.agentId)!;
    const moved = advance(agent, req.to, req.signoffs);
    if (!moved) return;
    setAgents((list) => list.map((a) => (a.id === agent.id ? moved : a)));
    setRequests((list) => list.filter((r) => r.id !== req.id));
    say(`${agent.name} moved to ${req.to}`);
  }

  function withdraw(req: OpenRequest) {
    const agent = agents.find((a) => a.id === req.agentId)!;
    setRequests((list) => list.filter((r) => r.id !== req.id));
    say(`Withdrew request for ${agent.name} to ${req.to}`);
  }

  const budgetPct = Math.min(100, (summary.totalCost / Math.max(summary.totalBudget, 1)) * 100);
  const tierMax = Math.max(1, ...Object.values(summary.byTier));

  return (
    <main className="wrap">
      <h1>Agent Rollout Control Center</h1>
      <p className="sub">
        One board for every AI agent a company runs: who owns it, what it costs, how risky it is, and what has to be
        true before it moves from pilot to live.
      </p>
      <div className="banner" role="note">
        Portfolio concept with synthetic data. The company, teams, people, and numbers are made up, and the risk
        scoring and gates are illustrative, not a standard.
      </div>

      <nav className="tabs" aria-label="Screens">
        {(
          [
            [1, "1. Fleet"],
            [2, `2. Approvals${requests.length ? ` (${requests.length})` : ""}`],
            [3, "3. Overview"],
          ] as [Screen, string][]
        ).map(([n, text]) => (
          <button key={n} className="tab-btn" aria-current={screen === n ? "page" : undefined} onClick={() => setScreen(n)}>
            {text}
          </button>
        ))}
      </nav>

      {screen === 1 && (
        <div className="stack">
          <section className="panel" aria-labelledby="fleet-h">
            <h2 id="fleet-h">Fleet</h2>
            <div className="filters">
              <div>
                <label htmlFor="fs">Stage</label>
                <select id="fs" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  {["All", "Proposed", "Pilot", "Limited", "Live", "Paused", "Retired"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ft">Team</label>
                <select id="ft" value={fTeam} onChange={(e) => setFTeam(e.target.value)}>
                  {teams.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fr">Risk tier</label>
                <select id="fr" value={fTier} onChange={(e) => setFTier(e.target.value)}>
                  {["All", "Low", "Medium", "High"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="small muted">
              {visible.length} of {agents.length} agents. Select a strip to see its checks and edit its facts.
            </p>

            {visible.length === 0 && <p className="muted">No agents match these filters. Set a filter back to All.</p>}

            <ul className="strips">
              {visible.map((a) => {
                const risk = riskOf(a);
                const over = a.monthlyBudget > 0 && a.monthlyCost > a.monthlyBudget;
                return (
                  <li key={a.id}>
                    <button
                      className={`strip ${selectedId === a.id ? "selected" : ""} ${a.status === "Retired" ? "retired" : ""}`}
                      onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
                      aria-pressed={selectedId === a.id}
                    >
                      <span className={`tier ${risk.tier}`}>{risk.tier}</span>
                      <span className="who">
                        <strong>{a.name}</strong>
                        <span className="small muted">
                          {a.team}, {a.owner ?? "no owner"}
                        </span>
                      </span>
                      <span className="cells">
                        <span className="cell">
                          <span className="k">Runs a month</span>
                          {count(a.monthlyRuns)}
                        </span>
                        <span className={`cell ${over ? "bad" : ""}`}>
                          <span className="k">Cost / budget</span>
                          {money(a.monthlyCost)} / {a.monthlyBudget ? money(a.monthlyBudget) : "none"}
                        </span>
                        <span className={`cell ${a.daysSinceReview > 90 && a.status !== "Retired" ? "bad" : ""}`}>
                          <span className="k">Last review</span>
                          {a.daysSinceReview} days ago
                        </span>
                      </span>
                      <Rail status={a.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {selected && (
            <section className="panel detail" aria-labelledby="detail-h">
              <h2 id="detail-h">{selected.name}</h2>
              <p>{selected.purpose}</p>
              <div className="two">
                <div>
                  <h3>Risk: {riskOf(selected).tier} (score {riskOf(selected).score})</h3>
                  <ul className="plain">
                    {riskOf(selected).reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>

                  <h3>Facts you can change</h3>
                  <div className="form">
                    <div>
                      <label htmlFor="own">Owner</label>
                      <input
                        id="own"
                        value={selected.owner ?? ""}
                        onChange={(e) => patch(selected.id, { owner: e.target.value || null })}
                      />
                    </div>
                    <div>
                      <label htmlFor="bud">Monthly budget ($, 0 for none)</label>
                      <input
                        id="bud"
                        type="number"
                        min={0}
                        value={selected.monthlyBudget}
                        onChange={(e) => patch(selected.id, { monthlyBudget: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </div>
                    <div>
                      <label htmlFor="aut">Autonomy</label>
                      <select
                        id="aut"
                        value={selected.autonomy}
                        onChange={(e) => patch(selected.id, { autonomy: e.target.value as Agent["autonomy"] })}
                      >
                        {AUTONOMY.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="dat">Most sensitive data it reads</label>
                      <select
                        id="dat"
                        value={selected.data}
                        onChange={(e) => patch(selected.id, { data: e.target.value as Agent["data"] })}
                      >
                        {DATA_CLASSES.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="checks">
                    {(
                      [
                        ["customerFacing", "Customer-facing"],
                        ["dataReviewed", "Data access reviewed"],
                        ["evalPassed", "Evaluation passed"],
                        ["logging", "Logging on"],
                        ["humanFallback", "Human fallback defined"],
                        ["incidentContact", "Incident contact named"],
                      ] as [keyof Agent, string][]
                    ).map(([key, text]) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={selected[key] as boolean}
                          onChange={(e) => patch(selected.id, { [key]: e.target.checked } as Partial<Agent>)}
                        />
                        {text}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  {nextStage(selected.status) ? (
                    <>
                      <h3>Checks to enter {nextStage(selected.status)}</h3>
                      <ul className="plain gates">
                        {gatesFor(selected, nextStage(selected.status)!).map((g) => (
                          <li key={g.id} className={g.met ? "met" : "unmet"}>
                            <span aria-hidden="true">{g.met ? "Met" : "Open"}</span>
                            <span>
                              {g.label}
                              {!g.met && <span className="small muted"> {g.fix}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="row">
                        <button
                          className="primary"
                          onClick={() => openRequest(selected)}
                          disabled={requests.some((r) => r.agentId === selected.id)}
                        >
                          Request move to {nextStage(selected.status)}
                        </button>
                        {requests.some((r) => r.agentId === selected.id) && (
                          <span className="small muted">A request is already open.</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="muted">
                      {selected.status === "Live"
                        ? "This agent is already live. There is no later stage."
                        : `A ${selected.status.toLowerCase()} agent has no next stage in this flow.`}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {screen === 2 && (
        <>
          <section className="panel" aria-labelledby="appr-h">
            <h2 id="appr-h">Approvals</h2>
            <p className="small muted">
              A move needs every check met and every required role to approve. One rejection stops it. Higher-risk
              agents need more sign-offs.
            </p>
            {requests.length === 0 && (
              <p className="muted">No open requests. Select an agent on the Fleet screen and request its next stage.</p>
            )}
            {requests.map((req) => {
              const agent = agents.find((a) => a.id === req.agentId)!;
              const result = assess(agent, req.to, req.signoffs);
              return (
                <article className={`req ${result.state}`} key={req.id}>
                  <header className="row between">
                    <div>
                      <strong>{agent.name}</strong>{" "}
                      <span className="muted">
                        {agent.status} to {req.to}
                      </span>
                    </div>
                    <span className={`state ${result.state}`}>
                      {result.state === "blocked" && "Blocked by open checks"}
                      {result.state === "waiting" && "Waiting for sign-off"}
                      {result.state === "rejected" && "Rejected"}
                      {result.state === "ready" && "Ready to move"}
                    </span>
                  </header>
                  <div className="two">
                    <div>
                      <h3>Checks</h3>
                      <ul className="plain gates">
                        {result.gates.map((g) => (
                          <li key={g.id} className={g.met ? "met" : "unmet"}>
                            <span aria-hidden="true">{g.met ? "Met" : "Open"}</span>
                            <span>
                              {g.label}
                              {!g.met && <span className="small muted"> {g.fix}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>Sign-offs for a {result.tier.toLowerCase()}-risk agent</h3>
                      <ul className="plain">
                        {result.roles.map((role) => {
                          const call = req.signoffs[role];
                          return (
                            <li className="role" key={role}>
                              <span>
                                {role}{" "}
                                <span className={`small ${call === "approved" ? "ok" : call === "rejected" ? "no" : "muted"}`}>
                                  {call === "approved" ? "Approved" : call === "rejected" ? "Rejected" : "Not yet"}
                                </span>
                              </span>
                              <span className="row">
                                <button className="secondary" onClick={() => signoff(req, role, "approved")}>
                                  Approve
                                </button>
                                <button className="danger" onClick={() => signoff(req, role, "rejected")}>
                                  Reject
                                </button>
                                {call && (
                                  <button className="link" onClick={() => signoff(req, role, null)}>
                                    Clear
                                  </button>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="row">
                    <button className="primary" onClick={() => promote(req)} disabled={result.state !== "ready"}>
                      Move to {req.to}
                    </button>
                    <button className="secondary" onClick={() => withdraw(req)}>
                      Withdraw request
                    </button>
                    <button
                      className="link"
                      onClick={() => {
                        setSelectedId(agent.id);
                        setScreen(1);
                      }}
                    >
                      Fix open checks on the Fleet screen
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="panel" aria-labelledby="log-h">
            <h2 id="log-h">Activity this session</h2>
            {log.length === 0 ? (
              <p className="muted">Nothing yet. Approvals and moves you make appear here, newest first.</p>
            ) : (
              <ul className="plain">
                {log.map((line, i) => (
                  <li key={`${i}-${line}`}>{line}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {screen === 3 && (
        <>
          <div className="figures">
            <div className="figure">
              <span className="k">Active agents</span>
              <span className="n">{summary.activeCount}</span>
              <span className="small muted">{summary.byStatus.Retired} retired not counted</span>
            </div>
            <div className="figure">
              <span className="k">Monthly runs</span>
              <span className="n">{count(summary.totalRuns)}</span>
              <span className="small muted">across all active agents</span>
            </div>
            <div className="figure">
              <span className="k">Open requests</span>
              <span className="n">{requests.length}</span>
              <span className="small muted">waiting on checks or sign-off</span>
            </div>
            <div className="figure">
              <span className="k">Need attention</span>
              <span className="n">{issues.length}</span>
              <span className="small muted">issues across {new Set(issues.map((i) => i.agentId)).size} agents</span>
            </div>
          </div>

          <section className="panel" aria-labelledby="cost-h">
            <h2 id="cost-h">Monthly cost against budget</h2>
            <div
              className="meter"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(budgetPct)}
              aria-label="Share of total budget spent"
            >
              <span style={{ width: `${budgetPct}%` }} />
            </div>
            <p className="small muted">
              {money(summary.totalCost)} spent of {money(summary.totalBudget)} budgeted. Agents with no budget add cost
              but nothing to this total, so check the attention list below.
            </p>
          </section>

          <section className="panel" aria-labelledby="mix-h">
            <h2 id="mix-h">Stage and risk mix</h2>
            <div className="two">
              <table>
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Agents</th>
                  </tr>
                </thead>
                <tbody>
                  {(["Proposed", "Pilot", "Limited", "Live", "Paused", "Retired"] as Status[]).map((s) => (
                    <tr key={s}>
                      <td>{s}</td>
                      <td>{summary.byStatus[s]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table>
                <thead>
                  <tr>
                    <th>Risk tier (active agents)</th>
                    <th>Agents</th>
                    <th aria-label="Bar" />
                  </tr>
                </thead>
                <tbody>
                  {(["High", "Medium", "Low"] as Tier[]).map((t) => (
                    <tr key={t}>
                      <td>{t}</td>
                      <td>{summary.byTier[t]}</td>
                      <td style={{ width: "45%" }}>
                        <div className={`bar ${t}`} aria-hidden="true">
                          <span style={{ width: `${(summary.byTier[t] / tierMax) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" aria-labelledby="att-h">
            <h2 id="att-h">Needs attention</h2>
            {issues.length === 0 ? (
              <p className="muted">Nothing needs attention.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Issue</th>
                    <th>Detail</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i) => (
                    <tr key={`${i.agentId}-${i.kind}`}>
                      <td>{i.agent}</td>
                      <td>{i.kind}</td>
                      <td>{i.detail}</td>
                      <td>
                        <button
                          className="link"
                          onClick={() => {
                            setSelectedId(i.agentId);
                            setScreen(1);
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
