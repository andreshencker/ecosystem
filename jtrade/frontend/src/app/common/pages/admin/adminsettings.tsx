import React from "react";
import {Link} from "react-router-dom";

export default function adminsettings() {
    return (
        <main className="container section">
            <h1 className="h2">Settings</h1>

            {/* NUEVA sección de perfil */}
            <section
                style={{
                    marginTop: 20,
                    background: "var(--panel, #0f0f16)",
                    border: "1px solid var(--border, #20202a)",
                    borderRadius: 16,
                    padding: 20,
                }}
            >
                <div
                    className="row"
                    style={{
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                color: "var(--muted, #8b8b99)",
                                letterSpacing: 0.2,
                            }}
                        >
                            Profile
                        </div>
                        <div style={{fontSize: 16, fontWeight: 600}}>
                            User information
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "var(--muted, #8b8b99)",
                                marginTop: 4,
                            }}
                        >
                            See and manage your account details (name, email).
                        </div>
                    </div>

                    <Link to="/admin/userProfile" className="btn btn-primary">
                        View profile
                    </Link>
                </div>
            </section>


            {/* NUEVA sección de perfil */}
            <section
                style={{
                    marginTop: 20,
                    background: "var(--panel, #0f0f16)",
                    border: "1px solid var(--border, #20202a)",
                    borderRadius: 16,
                    padding: 20,
                }}
            >
                <div
                    className="row"
                    style={{
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                color: "var(--muted, #8b8b99)",
                                letterSpacing: 0.2,
                            }}
                        >
                            Users
                        </div>
                        <div style={{fontSize: 16, fontWeight: 600}}>
                            User information
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "var(--muted, #8b8b99)",
                                marginTop: 4,
                            }}
                        >
                            See and manage users and roles.
                        </div>
                    </div>

                    <Link to="/admin/users" className="btn btn-primary">
                        View profile
                    </Link>
                </div>
            </section>

            <section
                style={{
                    marginTop: 20,
                    background: "var(--panel, #0f0f16)",
                    border: "1px solid var(--border, #20202a)",
                    borderRadius: 16,
                    padding: 20,
                }}
            >
                <div
                    className="row"
                    style={{
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                color: "var(--muted, #8b8b99)",
                                letterSpacing: 0.2,
                            }}
                        >
                            Integrations
                        </div>
                        <div style={{fontSize: 16, fontWeight: 600}}>
                            Platforms & API Keys
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "var(--muted, #8b8b99)",
                                marginTop: 4,
                            }}
                        >
                            Manage and link your trading/data platforms.
                        </div>
                    </div>

                    <Link to="/settings/integrations" className="btn btn-primary">
                        Manage API
                    </Link>
                </div>
            </section>


        </main>
    );
}

function Field({label, value}: { label: string; value: string }) {
    return (
        <div>
            <div
                style={{
                    fontSize: 12,
                    color: "var(--muted, #8b8b99)",
                    marginBottom: 6,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--inputBg, #0b0b0e)",
                    border: "1px solid var(--border, #20202a)",
                }}
            >
                {value}
            </div>
        </div>
    );
}