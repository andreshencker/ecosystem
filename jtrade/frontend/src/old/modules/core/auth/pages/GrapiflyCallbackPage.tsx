import { useEffect, useRef, useState } from "react";
import { Box, Button, Card, CardContent, Chip, CircularProgress, Container, Stack, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginWithGrapifly } from "../api/auth";
import { resolveLanding } from "@/old/app/routing/resolve/resolveLanding";
import { saveSession } from "@/lib/storage";
import { setAuthHeader } from "@/lib/http";
import { useAppConfig } from "@/old/app/providers/AppConfigProvider";
import { useAuth } from "../hooks/useAuth";

const plans = [
    { name: "Free trial", detail: "Explore the marketplace before choosing a plan.", features: ["Marketplace access", "Product discovery", "Grapifly workspace"], featured: true },
    { name: "Trader", detail: "For customers who use trading products.", features: ["Purchased products", "Platform connections", "Customer workspace"] },
    { name: "Developer", detail: "For creators who publish and sell products.", features: ["Developer storefront", "Product publishing", "Sales workspace"] },
];

export default function GrapiflyCallbackPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const app = useAppConfig();
    const { setToken, setUser } = useAuth();
    const grapiflyHome = import.meta.env.VITE_GRAPIFLY_WEB_URL ?? "http://localhost:3100/home";
    const grapiflyApps = new URL("/my-apps", grapiflyHome).toString();
    const accessRequired = params.get("error") === "access_required";
    // Grapifly SSO codes are single-use. Guard against React StrictMode's
    // double effect invocation (and any re-render) firing a second exchange
    // with an already-consumed code, which would 401 and tear down the session.
    const exchangeStarted = useRef(false);

    useEffect(() => {
        if (accessRequired) return;
        const code = params.get("code");
        if (!code) { setError("The Grapifly sign-in code is missing."); return; }
        if (exchangeStarted.current) return;
        exchangeStarted.current = true;
        loginWithGrapifly(code)
            .then(({ user, tokens }) => {
                saveSession({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user });
                setAuthHeader(tokens.accessToken);
                setToken(tokens.accessToken);
                setUser(user);
                navigate(resolveLanding(user), { replace: true });
            })
            .catch((reason) => setError(reason?.response?.data?.message ?? `Your Grapifly account does not have access to ${app.name}.`));
    }, [accessRequired, app.name, navigate, params, setToken, setUser]);

    if (accessRequired) return <Box sx={{ minHeight: "100vh", py: { xs: 6, md: 9 }, bgcolor: "background.default" }}><Container maxWidth="lg"><Stack alignItems="center" textAlign="center"><Chip label="ACCESS REQUIRED" color="primary"/><Typography variant="h1" sx={{ fontSize: { xs: 42, md: 62 }, letterSpacing: "-.055em", mt: 2, maxWidth: 850 }}>Choose how you want to use {app.name}.</Typography><Typography color="text.secondary" fontSize={18} maxWidth={680} mt={2}>Your Grapifly organization does not have access yet. Start with a trial or choose the plan that matches your role.</Typography></Stack><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" }, gap: 2, mt: 6 }}>{plans.map(plan => <Card key={plan.name} sx={{ borderRadius: 4, borderColor: plan.featured ? "primary.main" : "divider", transform: { md: plan.featured ? "translateY(-8px)" : "none" } }}><CardContent sx={{ p: 3.5 }}><Typography color={plan.featured ? "primary.main" : "text.secondary"} fontWeight={900}>{plan.name.toUpperCase()}</Typography><Typography variant="h4" fontWeight={900} mt={1}>{plan.name}</Typography><Typography color="text.secondary" mt={1} minHeight={48}>{plan.detail}</Typography><Stack spacing={1.25} mt={3}>{plan.features.map(item => <Stack key={item} direction="row" spacing={1} alignItems="center"><CheckRoundedIcon color="primary" fontSize="small"/><Typography>{item}</Typography></Stack>)}</Stack><Button href={grapiflyApps} variant={plan.featured ? "contained" : "outlined"} fullWidth sx={{ mt: 4 }}>{plan.featured ? "Request free trial" : "View plan in Grapifly"}</Button></CardContent></Card>)}</Box><Typography textAlign="center" color="text.secondary" variant="body2" mt={4}>Plan activation and billing are managed securely from your Grapifly account.</Typography></Container></Box>;

    return <Stack alignItems="center" justifyContent="center" minHeight="100vh" spacing={2} px={3}>{error ? <><Typography variant="h5" fontWeight={800}>{app.name} access unavailable</Typography><Typography color="text.secondary">{error}</Typography><Button variant="contained" href={grapiflyHome}>Return to Grapifly</Button></> : <Box textAlign="center"><CircularProgress/><Typography mt={2}>Connecting your Grapifly ID to {app.name}…</Typography></Box>}</Stack>;
}
