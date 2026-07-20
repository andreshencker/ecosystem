// src/modules/auth/components/ResetPasswordForm.tsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { resetPasswordApi } from "@/modules/core/auth/api/auth";

type Props = { token: string | null };

export default function ResetPasswordForm({ token }: Props) {
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const disabled = useMemo(() => {
        const minLenOk = password.length >= 6 && confirm.length >= 6;
        const matchOk = password === confirm;
        return submitting || !minLenOk || !matchOk;
    }, [submitting, password, confirm]);

    // ✅ mismo look que SignIn cuando no hay token
    if (!token) {
        return (
            <div className="auth-card">
                <div className="badge badge-yellow" style={{ marginBottom: 14 }}>
                    Secure • Fast
                </div>

                <h2 className="h2" style={{ margin: 0 }}>
                    Invalid link
                </h2>

                <div className="spacer" />

                <p className="body" style={{ opacity: 0.8, margin: 0 }}>
                    The reset link is missing or invalid. Please request a new one.
                </p>

                <div className="spacer" />

                <button
                    className="btn-solid"
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    style={{ width: "100%" }}
                >
                    Request new link
                </button>

                <div className="spacer" />

                <div className="helper-row">
                    <Link className="link" to="/signin">
                        Back to sign in
                    </Link>
                </div>
            </div>
        );
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const pass = password;
        const conf = confirm;

        if (pass.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        if (pass !== conf) {
            toast.error("Passwords do not match.");
            return;
        }

        try {
            setSubmitting(true);
            await resetPasswordApi({ token, newPassword: pass });
            toast.success("Password updated. You can now sign in.");
            navigate("/signin");
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            toast.error("Could not reset password. The link may have expired.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="auth-card" onSubmit={onSubmit} autoComplete="on">
            <div className="badge badge-yellow" style={{ marginBottom: 14 }}>
                Secure • Fast
            </div>

            <h2 className="h2" style={{ margin: 0 }}>
                Choose a new password
            </h2>

            <div className="spacer" />

            {/* New password */}
            <div className="form-row">
                <label style={{ fontWeight: 700 }}>New password</label>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 8,
                    }}
                >
                    <input
                        className="input"
                        type={showPass ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setShowPass((s) => !s)}
                        aria-label={showPass ? "Hide password" : "Show password"}
                        style={{ height: 48 }}
                    >
                        {showPass ? "Hide" : "Show"}
                    </button>
                </div>
            </div>

            {/* Confirm password */}
            <div className="form-row">
                <label style={{ fontWeight: 700 }}>Confirm password</label>
                <input
                    className="input"
                    type={showPass ? "text" : "password"}
                    name="confirm"
                    placeholder="Repeat new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                />
            </div>

            {/* Helper row (igual estilo que SignIn) */}
            <div className="helper-row" style={{ marginTop: 4 }}>
                <Link className="link" to="/signin">
                    Back to sign in
                </Link>
            </div>

            <div className="spacer" />

            <button
                type="submit"
                className="btn-solid"
                disabled={disabled}
                style={{ width: "100%" }}
            >
                {submitting ? "Updating…" : "Update password"}
            </button>
        </form>
    );
}