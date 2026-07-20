// src/modules/auth/pages/SignUpPage.tsx
import React from "react";
import RegisterForm from "@/modules/core/auth/components/RegisterForm";

export default function RegisterPage() {
    return (
        <section className="section container">
            <div className="auth-grid">
                {/* Lado izquierdo: copy/beneficios */}
                <div>
                    <div className="badge" style={{marginBottom: 12}}>
                        Premium • Secure • Fast
                    </div>
                    <h1 className="h1">Create account</h1>
                    <p className="lead" style={{maxWidth: 560}}>
                        Join a minimalist dashboard with real-time metrics, clean visuals,
                        and a confidence-inspiring experience.
                    </p>

                    <div className="spacer"/>

                    <div className="kpis">
                        <div className="kpi">
                            <div className="big">4.9★</div>
                            <div className="sub">App Rating</div>
                        </div>
                        <div className="kpi">
                            <div className="big">$2.4B+</div>
                            <div className="sub">Total Volume</div>
                        </div>
                        <div className="kpi">
                            <div className="big">120k</div>
                            <div className="sub">Users</div>
                        </div>
                        <div className="kpi">
                            <div className="big">&lt;120ms</div>
                            <div className="sub">Latency</div>
                        </div>
                    </div>
                </div>

                {/* Lado derecho: formulario */}
                <RegisterForm/>
            </div>
        </section>
    );
}