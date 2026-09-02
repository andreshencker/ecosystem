import { Box, Container, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useAppConfig } from "@/old/app/providers/AppConfigProvider";

export function PublicFooter() {
    const app = useAppConfig();
    return <Box component="footer" sx={{ borderTop: 1, borderColor: "divider", py: 4, mt: 8 }}><Container maxWidth="lg"><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}><Box><Typography fontWeight={900}>{app.name}</Typography><Typography variant="body2">A marketplace for trading builders and traders.</Typography></Box><Stack direction="row" spacing={2} sx={{ "& a": { color: "text.secondary", textDecoration: "none" } }}><Link to="/marketplace">Marketplace</Link><Link to="/developers">Developers</Link><Link to="/platforms">Platforms</Link></Stack></Stack></Container></Box>;
}
