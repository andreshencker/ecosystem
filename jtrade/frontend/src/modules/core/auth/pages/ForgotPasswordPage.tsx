import React from "react";
import ForgotPasswordForm from "@/modules/core/auth/components/ForgotPasswordForm";
import { Box, Typography, useTheme } from "@mui/material";

function KpiCard({ value, label }: { value: string; label: string }) {
    const theme = useTheme();

    return (
        <Box
            sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                px: 2.25,
                py: 2,
                minWidth: 160,
                boxShadow: theme.palette.mode === "dark" ? 10 : 2,
            }}
        >
            <Typography
                sx={{
                    fontWeight: 900,
                    fontSize: 22,
                    lineHeight: 1.1,
                    color: "text.primary",
                }}
            >
                {value}
            </Typography>

            <Typography
                sx={{
                    mt: 0.9,
                    fontWeight: 600,
                    fontSize: 14,
                    color: "text.secondary",
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}

export default function ForgotPasswordPage() {
    return (
        <section className="section container">
            <div className="auth-grid">
                {/* Lado izquierdo: copy */}
                <div>
                    <div className="badge" style={{ marginBottom: 12 }}>
                        Premium • Secure • Fast
                    </div>

                    <h1 className="h1">Reset your password</h1>

                    <p className="lead" style={{ maxWidth: 560 }}>
                        We’ll send a secure link to your email so you can choose a new
                        password and get back to your dashboard.
                    </p>

                    <div className="spacer" />

                    {/* ✅ KPIs alineados al theme */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <KpiCard value="99.99%" label="Secure sessions" />
                        <KpiCard value="<120ms" label="Response time" />
                    </Box>
                </div>

                {/* Lado derecho: formulario */}
                <ForgotPasswordForm />
            </div>
        </section>
    );
}