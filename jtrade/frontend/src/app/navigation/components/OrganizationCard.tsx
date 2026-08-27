import * as React from "react";
import { Box, Typography, Menu, MenuItem, ButtonBase } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/app/lib/http";
import { useAuth } from "@/modules/core/auth/hooks/useAuth";

interface JtradeOrganization {
    organizationId: string;
    name: string;
    slug: string;
    status: "active" | "suspended" | "archived";
    membership?: { role: "owner" | "admin" | "member" };
}

function switchToOrganization(organizationId: string) {
    const grapiflyUrl = import.meta.env.VITE_GRAPIFLY_ID_URL ?? "http://localhost:3101";
    window.location.href = `${grapiflyUrl.replace(/\/$/, "")}/auth/sso/jtrade?organizationId=${encodeURIComponent(organizationId)}`;
}

export default function OrganizationCard() {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const { user } = useAuth();

    const { data } = useQuery<JtradeOrganization[]>({
        queryKey: ["grapifly-organizations"],
        queryFn: () => api.get("/organizations").then(r => r.data.organizations),
        enabled: Boolean(user),
        staleTime: 60_000,
    });

    const organizations = data ?? [];
    const current = organizations.find(org => org.organizationId === user?.organizationId) ?? organizations[0];
    const canSwitch = organizations.length > 1;

    if (!current) return null;

    return (
        <Box px={2} pt={1.5} pb={0.5}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", fontSize: 10, pl: 0.5 }}>
                Organization
            </Typography>
            <ButtonBase
                onClick={canSwitch ? (event) => setAnchorEl(event.currentTarget) : undefined}
                sx={{
                    width: "100%", mt: 0.5, p: 1.25, borderRadius: 2, textAlign: "left",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    bgcolor: (t) => t.palette.mode === "dark" ? "action.hover" : "action.selected",
                    cursor: canSwitch ? "pointer" : "default",
                }}
            >
                <Box minWidth={0}>
                    <Typography variant="body2" fontWeight={650} noWrap>{current.name}</Typography>
                    {current.membership?.role && (
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>{current.membership.role}</Typography>
                    )}
                </Box>
                {canSwitch && <ExpandMoreIcon fontSize="small" sx={{ flexShrink: 0, ml: 1 }} />}
            </ButtonBase>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                {organizations.map(org => (
                    <MenuItem key={org.organizationId} selected={org.organizationId === current.organizationId} onClick={() => switchToOrganization(org.organizationId)}>
                        {org.organizationId === current.organizationId && <CheckIcon fontSize="small" sx={{ mr: 1 }} />}
                        {org.name}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
}
