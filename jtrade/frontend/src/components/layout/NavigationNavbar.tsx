// src/app/common/navigation/components/NavigationNavbar.tsx
import * as React from "react";
import {
    AppBar,
    Toolbar,
    Box,
    Button,
    IconButton,
    ButtonBase,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { NavLink, useLocation } from "react-router-dom";

import type { NavigationConfig, NavbarItem } from "@/old/app/navigation/types";
import AppBrand from "./AppBrand";
import AvatarBlock from "./AvatarBlock";
import AppSwitcherPopover from "./AppSwitcherPopover";
import { useAppConfig } from "@/old/app/providers/AppConfigProvider";
import { resolveLogoUrl } from "@/old/app/config/app-config";
import { useUIStore } from "@/stores/ui.store";

type Props = {
    config: NavigationConfig;
    categories: Extract<NavbarItem, { type: "category" }>[];
    onSelectCategory: (key: string) => void;
    onToggleSidebar: () => void;
    onOpenPopover: (el: HTMLElement) => void;
    headerHeight: number;
};

export default function NavigationNavbar({
                                             config,
                                             onSelectCategory,
                                             onToggleSidebar,
                                             onOpenPopover,
                                             headerHeight,
                                         }: Props) {
    const activeCategoryKey = useUIStore((s) => s.activeCategoryKey);
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down("sm"));
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));
    const { pathname } = useLocation();
    const appConfig = useAppConfig();

    const brandName = appConfig.name;
    const brandTo = config.brand?.to ?? "/";

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                height: headerHeight,
                zIndex: (t) => t.zIndex.drawer + 1,
            }}
        >
            <Toolbar
                sx={{
                    minHeight: headerHeight,
                    gap: 1,
                    px: { xs: 1, sm: 2 },
                }}
            >
                {/* LEFT */}
                {config.layout.hasSidebar && (
                    <IconButton
                        onClick={onToggleSidebar}
                        size="small"
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1.5,
                            bgcolor: "background.paper",
                            border: (t) => `1px solid ${t.palette.divider}`,
                            flex: "0 0 auto",
                        }}
                        aria-label="toggle sidebar"
                    >
                        <MenuIcon fontSize="small" />
                    </IconButton>
                )}

                {/* ✅ XS: solo icono; SM+: icono + texto */}
                <AppBrand
                    to={brandTo}
                    name={brandName}
                    logoUrl={resolveLogoUrl(appConfig.theme, theme.palette.mode)}
                    icon={appConfig.theme.icon}
                    size={isXs ? "sm" : "md"}
                    showText={!isXs}
                />

                <Box sx={{ flexGrow: 1 }} />

                {/* NAV ITEMS */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 0.5,
                        maxWidth: { xs: "56vw", md: "60vw", lg: "unset" },
                        overflowX: "auto",
                        "&::-webkit-scrollbar": { display: "none" },
                    }}
                >
                    {config.navbar.map((item) => {
                        const isLink = item.type === "link";
                        const isCategory = item.type === "category";
                        if (!isLink && !isCategory) return null;
                        if (config.role === "public" && isCompact && isLink && ["/developers", "/how-it-works", "/platforms"].includes(item.path)) return null;

                        const active = isLink
                            ? pathname === item.path || pathname.startsWith(item.path + "/")
                            : activeCategoryKey === item.key;

                        const Icon = item.icon;

                        // ✅ FIX: en XS solo ocultamos label si hay icono.
                        // Si NO hay icono, mostramos label para que no “desaparezca”.
                        const showLabel = !isXs || !Icon;

                        return (
                            <Button
                                key={isLink ? item.path : item.key}
                                component={isLink ? (NavLink as any) : "button"}
                                to={isLink ? item.path : undefined}
                                onClick={isCategory ? () => onSelectCategory(item.key) : undefined}
                                disableElevation
                                size="small"
                                variant={active ? "contained" : "text"}
                                color={active ? "primary" : "inherit"}
                                startIcon={Icon ? <Icon fontSize="small" /> : undefined}
                                sx={{
                                    borderRadius: 999,
                                    textTransform: "none",
                                    fontWeight: 800,
                                    px: { xs: 1, sm: 1.6 },
                                    minWidth: isXs ? 40 : "auto",
                                    flex: "0 0 auto",
                                }}
                            >
                                {showLabel ? item.label : null}
                            </Button>
                        );
                    })}
                </Box>

                {/* POPOVER */}
                {config.layout.hasPopover && (
                    <>
                    <AppSwitcherPopover />
                    <ButtonBase
                        onClick={(e) => onOpenPopover(e.currentTarget)}
                        sx={{
                            ml: 1,
                            p: 0.5,
                            borderRadius: "999px",
                            border: 1,
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": { boxShadow: 2, transform: "scale(1.03)" },
                            flex: "0 0 auto",
                        }}
                        aria-label="open account menu"
                    >
                        <AvatarBlock size={32} showName={false} />
                    </ButtonBase>
                    </>
                )}
            </Toolbar>
        </AppBar>
    );
}
