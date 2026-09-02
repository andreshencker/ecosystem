import * as React from "react";
import { Avatar, Box, ButtonBase, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import { alpha } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import { useAuth } from "@/old/modules/core/auth/hooks/useAuth";

interface JtradeOrganization {
    organizationId: string;
    name: string;
    slug: string;
    status: "active" | "suspended" | "archived";
    membership?: { role: "owner" | "admin" | "member" };
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

// Same redirect-through-Grapifly-SSO mechanism Relay's SidebarOrgCard already
// uses: Grapifly issues a fresh code scoped to the chosen org, jtrade's
// callback exchanges it and re-issues a jtrade JWT carrying the new org.
function switchToOrganization(organizationId: string) {
    const grapiflyUrl = import.meta.env.VITE_GRAPIFLY_ID_URL ?? "http://localhost:3101";
    window.location.href = `${grapiflyUrl.replace(/\/$/, "")}/auth/sso/jtrade?organizationId=${encodeURIComponent(organizationId)}`;
}

export default function OrganizationCard() {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const { user } = useAuth();

    const { data, isLoading, isError, error } = useQuery<JtradeOrganization[]>({
        queryKey: ["grapifly-organizations"],
        queryFn: () => api.get("/organizations").then(r => r.data.data.organizations),
        enabled: Boolean(user),
        staleTime: 60_000,
        retry: 1,
    });

    if (isError) {
        // Surfaced instead of silently disappearing — jtrade has no local copy of
        // organization data, this live call to Grapifly is the only source.
        // eslint-disable-next-line no-console
        console.error("[OrganizationCard] failed to load organizations:", error);
    }

    const organizations = data ?? [];
    const current = organizations.find(org => org.organizationId === user?.organizationId) ?? organizations[0];
    const canSwitch = organizations.length > 1;
    const menuOpen = Boolean(anchorEl);

    if (isLoading) {
        return (
            <Box px={1.5} pb={1.5}>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: .4, fontSize: "0.65rem", textTransform: "uppercase" }}>Organization</Typography>
                <Box sx={{ borderRadius: 2.5, height: 46, mt: 0.5, bgcolor: "action.hover" }} />
            </Box>
        );
    }

    if (isError || !current) {
        return (
            <Box px={1.5} pb={1.5}>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: .4, fontSize: "0.65rem", textTransform: "uppercase" }}>Organization</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Unavailable</Typography>
            </Box>
        );
    }

    return (
        <Box px={1.5} pb={1.5}>
            <ButtonBase
                onClick={canSwitch ? (event) => setAnchorEl(event.currentTarget) : undefined}
                aria-haspopup={canSwitch ? "true" : undefined}
                aria-expanded={menuOpen ? "true" : undefined}
                sx={(theme) => ({
                    width: "100%", display: "block", textAlign: "left", borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.07),
                    border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.28 : 0.12)}`,
                    px: 1.5, py: 1.15,
                    cursor: canSwitch ? "pointer" : "default",
                    transition: "background-color .2s ease, border-color .2s ease",
                    "&:hover": canSwitch ? {
                        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.11),
                        borderColor: alpha(theme.palette.primary.main, 0.35),
                    } : undefined,
                })}
            >
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: .4, fontSize: "0.65rem", textTransform: "uppercase" }}>
                    Organization
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mt={0.25}>
                    <Box minWidth={0}>
                        <Typography variant="body2" color="text.primary" fontWeight={650} noWrap>{current.name}</Typography>
                        {current.membership?.role && (
                            <Typography variant="caption" color="text.secondary">{capitalize(current.membership.role)}</Typography>
                        )}
                    </Box>
                    {canSwitch && <ExpandMoreIcon sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }} />}
                </Box>
            </ButtonBase>

            {canSwitch && (
                <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={() => setAnchorEl(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                    slotProps={{ paper: { sx: { mt: 1, minWidth: 240 } } }}
                >
                    {organizations.map(org => (
                        <MenuItem
                            key={org.organizationId}
                            selected={org.organizationId === current.organizationId}
                            onClick={() => { setAnchorEl(null); if (org.organizationId !== current.organizationId) switchToOrganization(org.organizationId); }}
                        >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <Avatar sx={{ width: 22, height: 22, fontSize: "0.65rem", fontWeight: 700 }}>{getInitials(org.name)}</Avatar>
                            </ListItemIcon>
                            <ListItemText primary={org.name} />
                            {org.organizationId === current.organizationId && <CheckIcon sx={{ fontSize: 18, color: "primary.main", ml: 1 }} />}
                        </MenuItem>
                    ))}
                </Menu>
            )}
        </Box>
    );
}
