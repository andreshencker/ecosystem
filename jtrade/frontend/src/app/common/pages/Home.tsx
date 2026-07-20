import * as React from "react";
import {
    alpha,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Grid,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function HomePage() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const YELLOW = "#ffd400";

    return (
        <Box>
            {/* HERO */}
            <Box
                component="section"
                sx={{
                    py: { xs: 7, md: 10 },
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: isDark
                        ? `radial-gradient(900px 500px at 20% 15%, ${alpha(YELLOW, 0.12)} 0%, transparent 55%),
               radial-gradient(900px 500px at 85% 25%, ${alpha("#7a5cff", 0.10)} 0%, transparent 60%),
               ${theme.palette.background.default}`
                        : `radial-gradient(900px 500px at 20% 15%, ${alpha(YELLOW, 0.18)} 0%, transparent 55%),
               radial-gradient(900px 500px at 85% 25%, ${alpha("#2aa7ff", 0.12)} 0%, transparent 60%),
               ${theme.palette.background.default}`,
                }}
            >
                <Container maxWidth="lg">
                    <Stack spacing={2.2} alignItems="center" textAlign="center">
                        <Chip
                            label="PREMIUM • SECURE • FAST"
                            sx={{
                                fontWeight: 900,
                                letterSpacing: 0.4,
                                px: 1,
                                borderRadius: 999,
                                bgcolor: alpha(YELLOW, isDark ? 0.14 : 0.18),
                                color: isDark ? alpha("#fff", 0.9) : "#6b5d00",
                                border: `1px solid ${alpha(YELLOW, 0.35)}`,
                            }}
                        />

                        <Typography
                            variant="h1"
                            sx={{
                                maxWidth: 980,
                                fontSize: { xs: 36, sm: 44, md: 52 },
                                lineHeight: 1.08,
                                fontWeight: 900,
                            }}
                        >
                            Trading with <Box component="span" sx={{ color: YELLOW }}>full control</Box>.
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                maxWidth: 820,
                                fontSize: { xs: 15, sm: 16 },
                                color: theme.palette.text.secondary,
                            }}
                        >
                            JTrade is a modern platform that turns signals into structured execution.
                            Manage indicators, alerts, execution subscriptions, and trading platforms with a clean,
                            fast, and reliable interface.
                        </Typography>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ pt: 1 }}>
                            <Button component={RouterLink} to="/signals" variant="contained" color="warning" size="large">
                                View signals
                            </Button>
                            <Button
                                component={RouterLink}
                                to="/alerts"
                                variant="outlined"
                                size="large"
                                sx={{ borderColor: isDark ? alpha("#fff", 0.18) : alpha("#111", 0.18) }}
                            >
                                Manage alerts
                            </Button>
                        </Stack>

                        {/* ✅ ALIGNED PREVIEW CARD (fix for your screenshot) */}
                        <Card
                            sx={{
                                mt: { xs: 3, md: 4 },
                                width: "100%",
                                maxWidth: 980,
                                overflow: "hidden",
                                borderRadius: 4,
                            }}
                        >
                            <Grid
                                container
                                sx={{
                                    minHeight: { xs: 360, md: 260 }, // helps balance content
                                    background: isDark
                                        ? "linear-gradient(120deg, #171726, #101018)"
                                        : "linear-gradient(120deg, #ffffff, #f7f7fb)",
                                }}
                            >
                                {/* Left: text */}
                                <Grid item xs={12} md={7} sx={{ display: "flex" }}>
                                    <Box
                                        sx={{
                                            p: { xs: 3, md: 3.5 },
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            gap: 2,
                                            width: "100%",
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.8 }}>
                                                Centralized operations
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                                View signals, alert status, and execution from a single dashboard.
                                                Less noise, clearer decisions.
                                            </Typography>
                                        </Box>

                                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                                            {["RBAC", "MT5 / Webhooks"].map((t) => (
                                                <Chip
                                                    key={t}
                                                    label={t}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 800,
                                                        bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#111", 0.05),
                                                        border: `1px solid ${theme.palette.divider}`,
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                </Grid>

                                {/* Right: illustration (centered & consistent) */}
                                <Grid
                                    item
                                    xs={12}
                                    md={5}
                                    sx={{
                                        display: "grid",
                                        placeItems: "center",
                                        borderLeft: { md: `1px solid ${theme.palette.divider}` },
                                        p: { xs: 3, md: 2 },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: { xs: 190, md: 170 },
                                            height: { xs: 190, md: 170 },
                                            borderRadius: 999,
                                            display: "grid",
                                            placeItems: "center",
                                            background: `linear-gradient(135deg, ${YELLOW}, #ff7a2a)`,
                                            boxShadow: `0 18px 48px ${alpha("#000", isDark ? 0.45 : 0.12)}`,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 58,
                                                height: 116,
                                                borderRadius: 999,
                                                bgcolor: isDark ? "#0d0d15" : "#111214",
                                                position: "relative",
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: 999,
                                                    bgcolor: YELLOW,
                                                    position: "absolute",
                                                    bottom: 10,
                                                    left: "50%",
                                                    transform: "translateX(-50%)",
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Card>
                    </Stack>
                </Container>
            </Box>

            {/* METRICS */}
            <Box component="section" sx={{ py: { xs: 5, md: 6 } }}>
                <Container maxWidth="lg">
                    <Grid container spacing={2} justifyContent="center">
                        {[
                            ["RBAC", "Role-based access"],
                            ["Signals", "Traceable history"],
                            ["Alerts", "Group control"],
                            ["<120ms", "Fast interface"],
                        ].map(([value, label]) => (
                            <Grid key={label} item xs={6} sm={6} md={3} sx={{ display: "flex" }}>
                                <Card sx={{ width: "100%", borderRadius: 3 }}>
                                    <CardContent sx={{ p: 2.2, minHeight: 88 }}>
                                        <Typography sx={{ fontWeight: 900, fontSize: 20 }}>{value}</Typography>
                                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.3 }}>
                                            {label}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* TRUST & CONTROL */}
            <Box component="section" sx={{ pb: { xs: 6, md: 7 } }}>
                <Container maxWidth="lg">
                    <Grid container spacing={2} alignItems="stretch">
                        <Grid item xs={12} md={8} sx={{ display: "flex" }}>
                            <Card sx={{ width: "100%", borderRadius: 3 }}>
                                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                                    <Chip
                                        label="Security"
                                        sx={{
                                            fontWeight: 900,
                                            borderRadius: 999,
                                            bgcolor: alpha(YELLOW, isDark ? 0.14 : 0.18),
                                            border: `1px solid ${alpha(YELLOW, 0.35)}`,
                                            color: isDark ? alpha("#fff", 0.9) : "#6b5d00",
                                        }}
                                    />

                                    <Typography variant="h2" sx={{ mt: 1.2, fontSize: { xs: 26, md: 30 } }}>
                                        Trust and control
                                    </Typography>

                                    <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary, maxWidth: 760 }}>
                                        JTrade organizes your operation with permissions, clear flows, and a modular base.
                                        Keep control of signals, alerts, and execution without losing traceability.
                                    </Typography>

                                    <Stack direction="row" spacing={1.2} sx={{ mt: 2, flexWrap: "wrap" }}>
                                        <Button component={RouterLink} to="/platforms" variant="outlined">
                                            View platforms
                                        </Button>
                                        <Button component={RouterLink} to="/docs" variant="contained" color="warning">
                                            API documentation
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4} sx={{ display: "flex" }}>
                            <Card
                                sx={{
                                    width: "100%",
                                    borderRadius: 3,
                                    display: "grid",
                                    placeItems: "center",
                                    p: 2,
                                    background: isDark
                                        ? `radial-gradient(520px 260px at 50% 30%, ${alpha("#2aa7ff", 0.18)} 0%, transparent 60%),
                       ${theme.palette.background.paper}`
                                        : `radial-gradient(520px 260px at 50% 30%, ${alpha("#7a5cff", 0.12)} 0%, transparent 60%),
                       ${theme.palette.background.paper}`,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 170,
                                        height: 170,
                                        borderRadius: 999,
                                        background: `linear-gradient(135deg, ${alpha("#7a5cff", 0.95)}, ${alpha("#2aa7ff", 0.95)})`,
                                        display: "grid",
                                        placeItems: "center",
                                        boxShadow: `0 18px 48px ${alpha("#000", isDark ? 0.45 : 0.12)}`,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 86,
                                            height: 86,
                                            borderRadius: 999,
                                            bgcolor: isDark ? "#0e0e14" : "#111214",
                                            position: "relative",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                width: 44,
                                                height: 6,
                                                bgcolor: YELLOW,
                                                borderRadius: 999,
                                                transform: "translate(-50%, -50%)",
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                width: 6,
                                                height: 44,
                                                bgcolor: YELLOW,
                                                borderRadius: 999,
                                                transform: "translate(-50%, -50%)",
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Card>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* KEY FEATURES */}
            <Box
                component="section"
                sx={{
                    py: { xs: 6, md: 7 },
                    borderTop: `1px solid ${theme.palette.divider}`,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    backgroundColor: alpha(YELLOW, isDark ? 0.06 : 0.12),
                }}
            >
                <Container maxWidth="lg">
                    <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 30 } }}>
                        Key features
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, maxWidth: 760, color: theme.palette.text.secondary }}>
                        Built to scale: clear modules, consistent UI, and a fast experience in both dark and light mode.
                    </Typography>

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        {[
                            ["Signal management", "Log by symbol, action, and date. Easy to audit and filter.", "#2aa7ff"],
                            ["Alerts & indicators", "Configure indicators and group alerts to control activation.", "#7a5cff"],
                            ["Subscribed execution", "Connect alerts to executions per platform and track the status.", "#ff4d8d"],
                        ].map(([title, desc, topColor]) => (
                            <Grid item xs={12} md={4} key={title} sx={{ display: "flex" }}>
                                <Card sx={{ width: "100%", borderRadius: 3, height: "100%" }}>
                                    <Box sx={{ height: 4, bgcolor: topColor }} />
                                    <CardContent sx={{ p: 2.5 }}>
                                        <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.8 }}>
                                            {title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                            {desc}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* TESTIMONIALS */}
            <Box component="section" sx={{ py: { xs: 6, md: 7 } }}>
                <Container maxWidth="lg">
                    <Grid container spacing={2}>
                        {[
                            ["“Everything is more organized and clear.”", "Operator / Trader"],
                            ["“Signals, alerts, and execution without chaos.”", "Trading team"],
                            ["“Fast, clean, and easy to maintain.”", "Dev / Backend"],
                        ].map(([quote, by]) => (
                            <Grid item xs={12} md={4} key={quote} sx={{ display: "flex" }}>
                                <Card sx={{ width: "100%", borderRadius: 3, height: "100%" }}>
                                    <CardContent sx={{ p: 2.5 }}>
                                        <Box
                                            sx={{
                                                p: 1.6,
                                                borderRadius: 2,
                                                bgcolor: YELLOW,
                                                color: "#111214",
                                                fontWeight: 900,
                                            }}
                                        >
                                            {quote}
                                        </Box>
                                        <Typography variant="body2" sx={{ mt: 1.2, color: theme.palette.text.secondary }}>
                                            {by}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
        </Box>
    );
}