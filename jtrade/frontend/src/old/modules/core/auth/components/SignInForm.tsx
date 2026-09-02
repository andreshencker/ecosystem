import { Box, Button, Card, CardContent, Stack, Typography, useTheme } from "@mui/material";
import AppBrand from "@/components/layout/AppBrand";
import { useAppConfig } from "@/old/app/providers/AppConfigProvider";
import { resolveLogoUrl } from "@/old/app/config/app-config";

export default function SignInForm() {
    const app = useAppConfig();
    const theme = useTheme();
    const grapiflyUrl = import.meta.env.VITE_GRAPIFLY_ID_URL ?? "http://localhost:3101";
    return <Stack spacing={2}>
        <Box display={{ xs: "flex", md: "none" }} justifyContent="center" mb={1}><AppBrand name={app.name} logoUrl={resolveLogoUrl(app.theme, theme.palette.mode)} icon={app.theme.icon} size="lg" /></Box>
        <Card variant="outlined" sx={{ borderRadius: 5, borderColor: "divider", boxShadow: "0 24px 70px rgba(25,20,45,.1)" }}><CardContent sx={{ p: { xs: 3, sm: 4 }, "&:last-child": { pb: { xs: 3, sm: 4 } } }}><Stack spacing={2.5}><Typography sx={{ fontSize: 32, fontWeight: 750, letterSpacing: "-.045em" }}>Welcome back.</Typography><Typography color="text.secondary" variant="body2">{`Explore and use trading products with your Grapifly ID in ${app.name}.`}</Typography><Button component="a" href={`${grapiflyUrl.replace(/\/$/, "")}/auth/sso/jtrade`} variant="contained" fullWidth sx={{ py: 1.35 }}>Continue with Grapifly ID</Button><Typography variant="caption" color="text.secondary" textAlign="center">New accounts start with trial access. Internal access can only be assigned by an administrator.</Typography></Stack></CardContent></Card>
    </Stack>;
}
