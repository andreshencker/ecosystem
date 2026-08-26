import { Box, Button, Card, CardContent, Link, Stack, Typography, useTheme } from "@mui/material";
import AppBrand from "@/app/navigation/components/AppBrand";
import { useAppConfig } from "@/app/providers/AppConfigProvider";
import { resolveLogoUrl } from "@/app/config/app-config";

export default function SignInForm({ flow = "client" }: { flow?: "client" | "provider" }) {
    const app = useAppConfig();
    const theme = useTheme();
    const supportsProvider = app.allowedFlows.includes("provider");
    const grapiflyUrl = import.meta.env.VITE_GRAPIFLY_ID_URL ?? "http://localhost:3101";
    return <Stack spacing={2}>
        <Box display={{ xs: "flex", md: "none" }} justifyContent="center" mb={1}><AppBrand name={app.name} logoUrl={resolveLogoUrl(app.theme, theme.palette.mode)} icon={app.theme.icon} size="lg" /></Box>
        <Card variant="outlined" sx={{ borderRadius: 5, borderColor: "divider", boxShadow: "0 24px 70px rgba(25,20,45,.1)" }}><CardContent sx={{ p: { xs: 3, sm: 4 }, "&:last-child": { pb: { xs: 3, sm: 4 } } }}><Stack spacing={2.5}><Typography sx={{ fontSize: 32, fontWeight: 750, letterSpacing: "-.045em" }}>{flow === "provider" ? "Build and sell." : "Welcome back."}</Typography><Typography color="text.secondary" variant="body2">{flow === "provider" ? `Create your provider workspace and start your onboarding in ${app.name}.` : `Explore and use trading products with your Grapifly ID in ${app.name}.`}</Typography><Button component="a" href={`${grapiflyUrl.replace(/\/$/, "")}/auth/sso/jtrade?flow=${flow}`} variant="contained" fullWidth sx={{ py: 1.35 }}>Continue as {flow === "provider" ? "provider" : "client"}</Button><Typography variant="caption" color="text.secondary" textAlign="center">New accounts start with trial access. Internal access can only be assigned by an administrator.</Typography>{supportsProvider && <Link href={flow === "provider" ? "/signin" : "/provider/signin"} textAlign="center" underline="hover">{flow === "provider" ? "I want to access as a client" : "I develop trading products"}</Link>}</Stack></CardContent></Card>
    </Stack>;
}
