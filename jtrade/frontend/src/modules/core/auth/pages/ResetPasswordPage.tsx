import React from "react";
import {useSearchParams} from "react-router-dom";
import ResetPasswordForm from "@/modules/core/auth/components/ResetPasswordForm";

export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const token = params.get("token");

    return (
        <section className="section container">
            <div className="auth-grid">
                {/* Lado izquierdo: copy */}
                <div>
                    <div className="badge" style={{marginBottom: 12}}>
                        Premium • Secure • Fast
                    </div>
                    <h1 className="h1">Set a new password</h1>
                    <p className="lead" style={{maxWidth: 560}}>
                        Choose a strong password to keep your dashboard and API keys safe.
                    </p>

                    <div className="spacer"/>

                    <div className="kpis">
                        <div className="kpi">
                            <div className="big">AES-256</div>
                            <div className="sub">Encryption</div>
                        </div>
                        <div className="kpi">
                            <div className="big">24/7</div>
                            <div className="sub">Monitoring</div>
                        </div>
                    </div>
                </div>

                {/* Lado derecho: formulario */}
                <ResetPasswordForm token={token}/>
            </div>
        </section>
    );
}