import * as React from "react";
import { Box, Chip, Typography, useTheme } from "@mui/material";

type Props = {
    title?: string;
    subtitle?: string;
};

export default function SignInMarketingPanel({
                                                 title = "Sign in",
                                                 subtitle = "Access powerful visual metrics with a clean, confidence-inspiring interface.",
                                             }: Props) {
    const theme = useTheme();

    const kpis = [
        { big: "4.9★", sub: "App Rating" },
        { big: "$2.4B+", sub: "Total Volume" },
        { big: "120k", sub: "Users" },
        { big: "<120ms", sub: "Latency" },
    ];

    return (
        <Box sx={{ minWidth: 0 }}>
            {/* Badge */}
            <Chip
                label="Premium • Secure • Fast"
                size="small"
                sx={{
                    mb: 1.5,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            />

            {/* Title */}
            <Typography
                variant="h2"
                sx={{
                    fontWeight: 900,
                    lineHeight: 1.05,
                    mb: 1.5,
                    fontSize: { xs: 44, sm: 56, md: 64 },
                    letterSpacing: -0.8,
                }}
            >
                {title}
            </Typography>

            {/* Subtitle */}
            <Typography
                variant="body1"
                sx={{
                    maxWidth: 560,
                    color: "text.secondary",
                    fontSize: { xs: 15.5, sm: 16, md: 16.5 },
                    lineHeight: 1.6,
                    mb: 4,
                }}
            >
                {subtitle}
            </Typography>

            {/* KPIs */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
                    gap: 2,
                    maxWidth: 760,
                }}
            >
                {kpis.map((k) => (
                    <Box
                        key={k.sub}
                        sx={{
                            borderRadius: 3,
                            p: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                            boxShadow: theme.palette.mode === "dark" ? "none" : 1,
                        }}
                    >
                        <Typography
                            sx={{
                                fontWeight: 900,
                                fontSize: { xs: 22, sm: 22, md: 24 },
                                mb: 0.5,
                            }}
                        >
                            {k.big}
                        </Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: 13.5 }}>
                            {k.sub}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}