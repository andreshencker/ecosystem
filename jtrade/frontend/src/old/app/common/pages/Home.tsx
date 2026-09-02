import { alpha, Box, Button, Card, Chip, Container, Stack, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import ShowChartOutlinedIcon from "@mui/icons-material/ShowChartOutlined";
import AutoGraphOutlinedIcon from "@mui/icons-material/AutoGraphOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import { useAppConfig } from "@/old/app/providers/AppConfigProvider";
import { PublicFooter } from "@/old/app/common/components/public/PublicFooter";

const productTypes = [
    { name: "Trading bots", description: "Automate strategies for MT4, MT5, cTrader and more.", icon: SmartToyOutlinedIcon, color: "#FFF0E5", to: "/marketplace" },
    { name: "Indicators", description: "Read markets with specialist analysis and clear signals.", icon: ShowChartOutlinedIcon, color: "#E8F4FF", to: "/marketplace" },
    { name: "Strategies", description: "Discover structured systems created by trading experts.", icon: AutoGraphOutlinedIcon, color: "#EAF8EE", to: "/marketplace" },
    { name: "Utilities", description: "Manage risk, execution and everyday trading workflows.", icon: TuneOutlinedIcon, color: "#F0ECFF", to: "/marketplace" },
];

export default function HomePage() {
    const app = useAppConfig();
    const theme = useTheme();
    const primary = theme.palette.primary.main;

    return (
        <Box sx={{ pt: { xs: 3, md: 4 } }}>
            <Container maxWidth="xl">
                <Box maxWidth={1280} mx="auto">
                    <Box
                        component="section"
                        sx={{
                            borderRadius: { xs: 4, md: 6 },
                            p: { xs: 4, sm: 5, md: 7 },
                            minHeight: { md: 390 },
                            color: "#fff",
                            background: `radial-gradient(circle at 85% 10%, ${alpha(primary, .38)}, transparent 27%), linear-gradient(135deg,#111116 0%,#24202D 65%,#332642 100%)`,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <Box>
                            <Chip
                                label={`${app.name.toUpperCase()} · BY GRAPIFLY`}
                                sx={{ bgcolor: "rgba(255,255,255,.12)", color: primary, letterSpacing: ".08em", fontWeight: 800 }}
                            />
                            <Typography sx={{ mt: 3, fontSize: { xs: 43, sm: 54, md: 68 }, lineHeight: .98, letterSpacing: "-.06em", fontWeight: 750, maxWidth: 800 }}>
                                Trading products.<br />Built to perform.
                            </Typography>
                            <Typography sx={{ mt: 3, maxWidth: 610, color: "rgba(255,255,255,.66)", fontSize: 17, lineHeight: 1.6 }}>
                                Discover bots, indicators and strategies created by developers for the trading platforms you already use.
                            </Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} mt={3.5}>
                                <Button component={Link} to="/marketplace" variant="contained" size="large">Explore marketplace</Button>
                                <Button component={Link} to="/developers" variant="outlined" size="large" startIcon={<CodeRoundedIcon />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,.3)", "&:hover": { borderColor: "#fff" } }}>Sell your products</Button>
                            </Stack>
                        </Box>
                    </Box>

                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "flex-end" }} mt={{ xs: 6, md: 8 }} mb={3} gap={2}>
                        <Box>
                            <Typography color="primary.main" fontWeight={800} fontSize={13}>EXPLORE THE MARKETPLACE</Typography>
                            <Typography sx={{ fontSize: { xs: 32, md: 38 }, fontWeight: 750, letterSpacing: "-.045em", mt: .5 }}>Everything traders can use.</Typography>
                        </Box>
                        <Typography color="text.secondary" maxWidth={440}>Each product solves a specific trading need and connects developers with customers across the ecosystem.</Typography>
                    </Stack>

                    <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={2}>
                        {productTypes.map(({ name, description, icon: Icon, color, to }) => (
                            <Card component={Link} to={to} key={name} sx={{ p: 3, minHeight: 245, bgcolor: color, color: "#111116", border: 0, display: "flex", flexDirection: "column", textDecoration: "none", borderRadius: 4 }}>
                                <Box sx={{ width: 50, height: 50, borderRadius: 3, bgcolor: "rgba(255,255,255,.82)", display: "grid", placeItems: "center" }}><Icon /></Box>
                                <Box mt="auto"><Typography sx={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.03em" }}>{name}</Typography><Typography sx={{ color: "rgba(17,17,22,.62)", mt: .5 }}>{description}</Typography></Box>
                                <ArrowForwardRoundedIcon sx={{ alignSelf: "flex-end", mt: 2 }} />
                            </Card>
                        ))}
                    </Box>

                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={3} mt={{ xs: 6, md: 9 }} sx={{ borderTop: 1, borderColor: "divider", pt: 5 }}>
                        <Box maxWidth={680}><Typography variant="h3" sx={{ fontSize: { xs: 29, md: 38 }, letterSpacing: "-.04em" }}>Build trading products? There is a place for your work.</Typography><Typography color="text.secondary" mt={1.5}>Publish bots, indicators and utilities, explain how they work and reach customers using compatible platforms.</Typography></Box>
                        <Button component={Link} to="/developers" variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />}>For developers</Button>
                    </Stack>
                </Box>
            </Container>
            <PublicFooter />
        </Box>
    );
}
