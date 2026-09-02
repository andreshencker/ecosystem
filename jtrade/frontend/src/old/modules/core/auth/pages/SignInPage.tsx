import { alpha, Box, Typography, useTheme } from "@mui/material";
import AppBrand from "@/components/layout/AppBrand";
import SignInForm from "@/old/modules/core/auth/components/SignInForm";
import { useAppConfig } from "@/old/app/providers/AppConfigProvider";
import { resolveLogoUrl } from "@/old/app/config/app-config";

export default function LoginPage() {
    const app = useAppConfig();
    const theme = useTheme();
    return <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={(theme) => ({ background: `radial-gradient(circle at 15% 15%, ${alpha(theme.palette.primary.main, .22)} 0, transparent 30%), radial-gradient(circle at 85% 80%, ${alpha(theme.palette.secondary.main, .16)} 0, transparent 32%), ${theme.palette.background.default}` })}>
        <Box width="100%" maxWidth={1120} px={{ xs: 2, md: 4 }} display="grid" gridTemplateColumns={{ xs: "1fr", md: "1.1fr .9fr" }} gap={{ xs: 4, md: 10 }} alignItems="center">
            <Box display={{ xs: "none", md: "block" }}><AppBrand name={app.name} logoUrl={resolveLogoUrl(app.theme, theme.palette.mode)} icon={app.theme.icon} size="lg" /><Typography sx={{ fontSize: 64, lineHeight: .98, letterSpacing: "-.06em", fontWeight: 750, mt: 4, maxWidth: 570 }}>Trading products.<br />Securely connected.</Typography><Typography sx={{ color: "text.secondary", fontSize: 18, lineHeight: 1.55, mt: 3, maxWidth: 510 }}>{app.description}</Typography></Box>
            <Box maxWidth={460} width="100%" mx="auto"><SignInForm /></Box>
        </Box>
    </Box>;
}
