// src/app/pages/ClientSettings.tsx
import * as React from "react";
import {Box, Button, Card, CardContent, Stack, Typography,} from "@mui/material";
import {Link as RouterLink} from "react-router-dom";
import ThemeSwitcher from "@/old/app/common/theme/ThemeSwitcher";

export default function ClientSettings() {

    return (
        <Box
            component="main"
            sx={{
                maxWidth: 1080,
                mx: "auto",
                px: 2,
                py: 0,
                height: "100vh",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Header fijo */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    bgcolor: "background.default",
                    borderBottom: 1,
                    borderColor: "divider",
                    py: 1,
                }}
            >
                <Typography variant="h5" fontWeight={800}>
                    Settings
                </Typography>
                <Typography variant="body2" sx={{color: "text.secondary"}}>
                    Frontend connection parameters (read-only).
                </Typography>
            </Box>

            {/* Scroll solo para tarjetas */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    pt: 1,
                    pb: 2,
                }}
            >
                <Stack spacing={1}>
                    {/* Tarjeta de Theme */}
                    <Section
                        title="Appearance"
                        subtitle="Theme"
                        helper="Change how the interface looks."
                        action={<ThemeSwitcher/>}
                    />

                    {/* Tarjeta de Profile */}
                    <Section
                        title="Profile"
                        subtitle="User information"
                        helper="See and manage your account details (name, email)."
                        action={
                            <Button
                                variant="contained"
                                color="primary"
                                component={RouterLink}
                                to="/client/settings/profile" // ✅ absoluta
                                sx={{borderRadius: 0, fontWeight: 700}}
                            >
                                View profile
                            </Button>
                        }
                    />

                    {/* Tarjeta de Integrations */}
                    <Section
                        title="Integrations"
                        subtitle="Platforms & API Keys"
                        helper="Manage and link your trading/data platforms. Add API keys for Binance, Interactive Brokers, and more."
                        action={
                            <Button
                                variant="contained"
                                color="primary"
                                component={RouterLink}
                                to="/client/settings/integrations" // ✅ absoluta
                                sx={{borderRadius: 0, fontWeight: 700}}
                            >
                                Manage API
                            </Button>
                        }
                    />
                </Stack>
            </Box>
        </Box>
    );
}

/** Sección reusable (todas cuadradas) */
function Section({
                     title,
                     subtitle,
                     helper,
                     action,
                 }: {
    title: string;
    subtitle: string;
    helper?: string;
    action?: React.ReactNode;
}) {

    return (
        <Card
            variant="outlined"
            sx={{
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 0, // ◻️ todas cuadradas
            }}
        >
            <CardContent sx={{p: 2}}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                    }}
                >
                    <Box sx={{minWidth: 260}}>
                        <Typography
                            variant="caption"
                            sx={{color: "text.secondary", letterSpacing: 0.2}}
                        >
                            {title}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {subtitle}
                        </Typography>
                        {helper && (
                            <Typography
                                variant="body2"
                                sx={{mt: 0.3, color: "text.secondary"}}
                            >
                                {helper}
                            </Typography>
                        )}
                    </Box>

                    {action}
                </Box>
            </CardContent>
        </Card>
    );
}