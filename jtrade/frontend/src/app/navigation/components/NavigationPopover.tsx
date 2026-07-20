// src/app/common/navigation/components/NavigationPopover.tsx
import * as React from "react";
import { Box, Button, Divider, Popover, Stack, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";

import ThemeSwitcher from "@/app/common/theme/ThemeSwitcher";
import type { NavigationConfig, PopoverAction } from "../types";
import AvatarBlock from "./AvatarBlock";
import { useAuth } from "@/modules/core/auth/hooks/useAuth";
import { useThemeMode } from "@/app/common/theme/AppThemeProvider";

type Props = {
    config: NavigationConfig;
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
};

export default function NavigationPopover({
                                              config,
                                              anchorEl,
                                              open,
                                              onClose,
                                          }: Props) {
    const { logout } = useAuth();
    const { setMode } = useThemeMode();

    const rawItems = config.popover?.items ?? [];
    const items: PopoverAction[] = Array.isArray(rawItems) ? rawItems : [];

    const headerSlot = config.popover?.headerSlot;
    const bodySlot = config.slots?.popoverBodySlot;

    const handleLogout = async () => {
        onClose();
        setMode("dark");
        await logout();
    };

    const handleAction = async (a: PopoverAction) => {
        if (a.key === "logout") {
            await handleLogout();
            return;
        }

        if (a.key === "tradingView") {
            onClose();
            config.slots?.onOpenTradingView?.();
            return;
        }

        onClose();
        a.onClick?.();
    };

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
                sx: (theme) => ({
                    width: 360,
                    maxWidth: "calc(100vw - 24px)",
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    boxShadow: theme.shadows[10],
                }),
            }}
        >
            {/* Header */}
            <Box
                sx={(theme) => ({
                    px: 2,
                    pt: 2,
                    pb: 1.5,
                    background:
                        theme.palette.mode === "dark"
                            ? "linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,0))"
                            : "linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,0))",
                })}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <AvatarBlock size={56} showName />
                </Stack>

                {headerSlot ? <Box sx={{ mt: 1.25 }}>{headerSlot}</Box> : null}
            </Box>

            <Divider />

            {/* Theme row */}
            <Box sx={{ px: 1.5, py: 1 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 0.5,
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Appearance
                    </Typography>
                    <ThemeSwitcher />
                </Box>
            </Box>

            {/* Optional body slot */}
            {bodySlot ? (
                <>
                    <Divider />
                    <Box sx={{ p: 1.5 }}>{bodySlot}</Box>
                </>
            ) : null}

            <Divider />

            {/* Actions */}
            <Box sx={{ p: 1 }}>
                {items.map((a) => {
                    const Icon = a.icon;

                    return (
                        <React.Fragment key={a.key}>
                            {a.dividerTop ? <Divider sx={{ my: 1 }} /> : null}

                            {a.to ? (
                                <Button
                                    component={NavLink as any}
                                    to={a.to}
                                    fullWidth
                                    size="small"
                                    onClick={onClose}
                                    startIcon={Icon ? <Icon fontSize="small" /> : undefined}
                                    sx={{
                                        justifyContent: "flex-start",
                                        textTransform: "none",
                                        borderRadius: 1.5,
                                        fontWeight: 600,
                                    }}
                                >
                                    {a.label}
                                </Button>
                            ) : (
                                <Button
                                    fullWidth
                                    size="small"
                                    onClick={() => void handleAction(a)}
                                    startIcon={Icon ? <Icon fontSize="small" /> : undefined}
                                    sx={{
                                        justifyContent: "flex-start",
                                        textTransform: "none",
                                        borderRadius: 1.5,
                                        fontWeight: a.key === "logout" ? 700 : 600,
                                    }}
                                >
                                    {a.label}
                                </Button>
                            )}
                        </React.Fragment>
                    );
                })}
            </Box>
        </Popover>
    );
}