// src/modules/admin/pages/admindashboard.tsx
import React from "react";

function SectionTitle({children}: { children: React.ReactNode }) {
    return (
        <div className="row" style={{justifyContent: "space-between", alignItems: "baseline", marginBottom: 12}}>
            <h2 className="h2" style={{margin: 0}}>{children}</h2>
            <span style={{color: "var(--muted)", fontSize: 12}}>Live</span>
        </div>
    );
}

function Card({children, padded = true}: { children: React.ReactNode; padded?: boolean }) {
    return (
        <div
            className="card"
            style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: padded ? 16 : 0,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
        >
            {children}
        </div>
    );
}

function Stat({
                  label,
                  value,
                  sub,
              }: {
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <Card>
            <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                <div style={{color: "var(--muted)", fontSize: 12}}>{label}</div>
                <div style={{fontWeight: 700, fontSize: 24}}>{value}</div>
                {sub ? <div style={{color: "var(--muted)", fontSize: 12}}>{sub}</div> : null}
            </div>
        </Card>
    );
}

export default function AdminDashboard() {
    return (
        <div className="container" style={{display: "grid", gap: 24}}>
            {/* HERO */}
            <Card>
                <div
                    className="row"
                    style={{justifyContent: "space-between", alignItems: "center", gap: 16}}
                >
                    <div style={{display: "grid", gap: 6}}>
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 11,
                                color: "#000",
                                background: "var(--yellow)",
                                padding: "6px 10px",
                                borderRadius: 999,
                                fontWeight: 700,
                                width: "fit-content",
                            }}
                        >
                            SECURE • FAST
                        </div>
                        <h1 className="h1" style={{margin: 0}}>Welcome back, Admin</h1>
                        <div style={{color: "var(--muted)"}}>
                            Overview of the platform metrics, API health and recent activity.
                        </div>
                    </div>

                    {/* mini sparkline */}
                    <Card padded={false}>
                        <div style={{padding: 12, width: 280}}>
                            <div style={{fontSize: 12, color: "var(--muted)", marginBottom: 6}}>
                                API Calls (24h)
                            </div>
                            <svg viewBox="0 0 280 70" width="100%" height="70">
                                <polyline
                                    fill="none"
                                    stroke="var(--yellow)"
                                    strokeWidth="3"
                                    points="0,60 20,50 40,52 60,40 80,35 100,45 120,30 140,42 160,22 180,28 200,18 220,26 240,14 260,20 280,10"
                                />
                            </svg>
                        </div>
                    </Card>
                </div>
            </Card>

            {/* QUICK STATS */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 16,
                }}
            >
                <Stat label="Total Users" value="12,480" sub="+1.9% this week"/>
                <Stat label="Linked Accounts" value="3,214" sub="Binance • IBKR • Others"/>
                <Stat label="API Calls (24h)" value="1.2M" sub="+4.3% vs. prev 24h"/>
                <Stat label="Error Rate" value="0.21%" sub="≤ 1% target"/>
            </div>

            {/* GRID: ACTIVITY + STATUS */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: 16,
                }}
            >
                {/* Recent activity */}
                <Card>
                    <SectionTitle>Recent activity</SectionTitle>
                    <div style={{display: "grid", gap: 12}}>
                        {[
                            {t: "User created", d: "andres@domain.com was added (role: admin)"},
                            {t: "API key rotated", d: "x-api-key updated by system"},
                            {t: "Platform linked", d: "john@doe.com linked Binance Futures"},
                            {t: "Role changed", d: "marie@co.com upgraded to analyst"},
                            {t: "Webhook delivered", d: "order_update (200 • 132ms)"},
                        ].map((i, k) => (
                            <div
                                key={k}
                                className="row"
                                style={{
                                    justifyContent: "space-between",
                                    borderTop: k === 0 ? "none" : "1px solid var(--line)",
                                    paddingTop: k === 0 ? 0 : 12,
                                }}
                            >
                                <div style={{display: "grid", gap: 4}}>
                                    <div style={{fontWeight: 600}}>{i.t}</div>
                                    <div style={{color: "var(--muted)", fontSize: 12}}>{i.d}</div>
                                </div>
                                <button
                                    className="btn"
                                    style={{
                                        background: "transparent",
                                        border: "1px solid var(--line)",
                                        color: "var(--muted)",
                                        padding: "6px 10px",
                                        borderRadius: 10,
                                    }}
                                >
                                    View
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* System / API status */}
                <Card>
                    <SectionTitle>System / API status</SectionTitle>

                    <div style={{display: "grid", gap: 12}}>
                        {[
                            {name: "Auth Service", status: "Operational", latency: "84ms"},
                            {name: "Users API", status: "Operational", latency: "72ms"},
                            {name: "Binance Connector", status: "Degraded (rate-limit)", latency: "129ms"},
                            {name: "Webhooks", status: "Operational", latency: "58ms"},
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="row"
                                style={{justifyContent: "space-between", alignItems: "center"}}
                            >
                                <div style={{display: "grid", gap: 4}}>
                                    <div style={{fontWeight: 600}}>{s.name}</div>
                                    <div style={{color: "var(--muted)", fontSize: 12}}>
                                        Latency: {s.latency}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        background:
                                            s.status.startsWith("Operational")
                                                ? "rgba(50, 200, 120, 0.15)"
                                                : "rgba(240, 189, 11, 0.15)",
                                        border:
                                            s.status.startsWith("Operational")
                                                ? "1px solid rgba(50, 200, 120, 0.35)"
                                                : "1px solid rgba(240, 189, 11, 0.35)",
                                        padding: "6px 10px",
                                        borderRadius: 999,
                                    }}
                                >
                                    {s.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* CALLS VS ERRORS */}
            <Card>
                <SectionTitle>Calls vs Errors (7d)</SectionTitle>
                <div className="row" style={{gap: 16, alignItems: "center"}}>
                    <div style={{color: "var(--muted)", fontSize: 12}}>
                        Placeholder chart — plug your series when estén listas.
                    </div>
                    <div style={{flex: 1}}>
                        <svg viewBox="0 0 600 120" width="100%" height="120">
                            <polyline
                                fill="rgba(240,185,11,0.1)"
                                stroke="var(--yellow)"
                                strokeWidth="2"
                                points="0,80 50,70 100,72 150,60 200,55 250,65 300,50 350,62 400,42 450,48 500,38 550,46 600,34"
                            />
                            <polyline
                                fill="none"
                                stroke="rgba(240,61,61,0.9)"
                                strokeWidth="2"
                                points="0,100 50,102 100,96 150,98 200,92 250,95 300,90 350,92 400,86 450,88 500,84 550,86 600,82"
                            />
                        </svg>
                    </div>
                </div>
            </Card>
        </div>
    );
}