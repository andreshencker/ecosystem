import * as React from "react";
import { Box, IconButton, Popover, Typography } from "@mui/material";
import AppsIcon from "@mui/icons-material/Apps";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/app/lib/http";

interface EnabledApp {
    key: string;
    name: string;
    launchUrl: string;
    theme: { icon: string; logoUrl: string | null; light: { primaryColor: string; textColor: string } };
}

export default function AppSwitcherPopover() {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    const { data, isLoading, isError, error } = useQuery<EnabledApp[]>({
        queryKey: ["app-switcher"],
        queryFn: () => api.get("/app-switcher").then(r => r.data.data.applications),
        enabled: open,
        retry: 1,
    });

    if (isError) {
        // eslint-disable-next-line no-console
        console.error("[AppSwitcherPopover] failed to load enabled apps:", error);
    }

    return (
        <>
            <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} aria-label="Switch apps" size="small" sx={{ flexShrink: 0 }}>
                <AppsIcon fontSize="small" />
            </IconButton>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { mt: 1, width: 280, p: 1.5 } } }}
            >
                {isLoading && <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Loading apps…</Typography>}
                {!isLoading && isError && <Typography variant="body2" color="error" textAlign="center" py={2}>Apps could not be loaded.</Typography>}
                {!isLoading && !isError && (data?.length ?? 0) === 0 && <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>No apps enabled yet.</Typography>}
                {!isLoading && !isError && (data?.length ?? 0) > 0 && (
                    <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={0.5}>
                        {data!.map((app) => (
                            <Box
                                key={app.key}
                                component="a"
                                href={app.launchUrl}
                                onClick={() => setAnchorEl(null)}
                                sx={{
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                                    py: 1.5, px: 0.5, borderRadius: 1.5, textDecoration: "none", color: "text.primary",
                                    textAlign: "center", "&:hover": { bgcolor: "action.hover" },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 44, height: 44, borderRadius: "13px", display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 18, fontWeight: 750, overflow: "hidden",
                                        bgcolor: app.theme.light.primaryColor, color: app.theme.light.textColor,
                                    }}
                                >
                                    {app.theme.logoUrl ? <Box component="img" src={app.theme.logoUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "contain" }} /> : (app.theme.icon || app.name[0])}
                                </Box>
                                <Typography variant="caption" fontWeight={650} noWrap sx={{ maxWidth: "100%" }}>{app.name}</Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Popover>
        </>
    );
}
