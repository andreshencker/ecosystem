// src/app/common/navigation/components/NavigationSidebar.tsx
import * as React from "react";
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Tooltip,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { NavLink, useLocation } from "react-router-dom";
import type { SidebarItem } from "../types";
import OrganizationCard from "./OrganizationCard";

type Props = {
    open: boolean;
    onClose: () => void;
    desktop: boolean;
    headerHeight: number;
    drawerWidth: number;
    collapsed?: boolean;
    items: SidebarItem[];
    activeCategoryKey: string | null;
};

type SidebarContentProps = {
    items: SidebarItem[];
    collapsed?: boolean;
    activeCategoryKey: string | null;
    pathname: string;
    desktop: boolean;
    onClose: () => void;
};

function SidebarContent({
                            items,
                            collapsed = false,
                            activeCategoryKey,
                            pathname,
                            desktop,
                            onClose,
                        }: SidebarContentProps) {
    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
            }}
        >
            {!collapsed && <OrganizationCard />}
            <List
                dense
                subheader={
                    collapsed ? null : (
                        <ListSubheader
                            disableSticky
                            sx={{
                                bgcolor: "background.paper",
                                color: "text.secondary",
                                px: 2,
                                pt: 1.5,
                                pb: 0.75,
                                lineHeight: 1.6,
                                fontWeight: 700,
                                flexShrink: 0,
                            }}
                        >
                            {activeCategoryKey ? activeCategoryKey.toUpperCase() : "MENU"}
                        </ListSubheader>
                    )
                }
                sx={{
                    px: collapsed ? 0.5 : 1,
                    py: 1.25,
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                {items.map((item) => {
                    const active =
                        pathname === item.path || pathname.startsWith(item.path + "/");
                    const Icon = item.icon;

                    const row = (
                        <ListItemButton
                            key={item.path}
                            component={NavLink as any}
                            to={item.path}
                            selected={active}
                            onClick={!desktop ? onClose : undefined}
                            sx={{
                                mx: collapsed ? 0.5 : 0,
                                mb: 0.5,
                                borderRadius: 1.5,
                                justifyContent: collapsed ? "center" : "flex-start",
                                px: collapsed ? 1 : 1.25,
                                minHeight: 44,
                                overflow: "hidden",
                            }}
                        >
                            {Icon && (
                                <ListItemIcon
                                    sx={{
                                        minWidth: collapsed ? "unset" : 34,
                                        justifyContent: "center",
                                        color: "inherit",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon fontSize="small" />
                                </ListItemIcon>
                            )}

                            {!collapsed && (
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        noWrap: true,
                                        fontSize: 14,
                                        fontWeight: active ? 800 : 500,
                                    }}
                                    sx={{ minWidth: 0 }}
                                />
                            )}
                        </ListItemButton>
                    );

                    return collapsed && desktop ? (
                        <Tooltip key={item.path} title={item.label} placement="right">
                            {row}
                        </Tooltip>
                    ) : (
                        row
                    );
                })}
            </List>
        </Box>
    );
}

export default function NavigationSidebar({
                                              open,
                                              onClose,
                                              desktop,
                                              headerHeight,
                                              drawerWidth,
                                              collapsed = false,
                                              items,
                                              activeCategoryKey,
                                          }: Props) {
    const { pathname } = useLocation();
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down("sm"));

    const mobileDrawerWidth = isXs ? "82vw" : 320;

    if (desktop) {
        return (
            <Box
                sx={{
                    width: drawerWidth,
                    height: "100%",
                    minHeight: 0,
                    borderRight: 1,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                    overflow: "hidden",
                }}
            >
                <SidebarContent
                    items={items}
                    collapsed={collapsed}
                    activeCategoryKey={activeCategoryKey}
                    pathname={pathname}
                    desktop
                    onClose={onClose}
                />
            </Box>
        );
    }

    return (
        <Drawer
            variant="temporary"
            open={open}
            onClose={onClose}
            ModalProps={{ keepMounted: true }}
            sx={{
                "& .MuiDrawer-paper": {
                    width: mobileDrawerWidth,
                    boxSizing: "border-box",
                    borderRight: 1,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    top: `${headerHeight}px`,
                    height: `calc(100vh - ${headerHeight}px)`,
                    overflow: "hidden",
                },
            }}
        >
            <Box
                sx={{
                    width: mobileDrawerWidth,
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <SidebarContent
                    items={items}
                    collapsed={false}
                    activeCategoryKey={activeCategoryKey}
                    pathname={pathname}
                    desktop={false}
                    onClose={onClose}
                />
            </Box>
        </Drawer>
    );
}