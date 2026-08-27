import * as React from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import type { NavigationConfig } from "../types";
import { useNavigationState } from "../state/navigation.state";
import NavigationNavbar from "./NavigationNavbar";
import NavigationSidebar from "./NavigationSidebar";
import NavigationPopover from "./NavigationPopover";
import { useUIStore } from "@/app/stores/ui.store";

type Props = {
    config: NavigationConfig;
    headerHeight?: number;
    drawerWidth?: number;
    drawerCollapsedWidth?: number;
};

export default function NavigationLayout({
                                             config,
                                             headerHeight = 56,
                                             drawerWidth = 260,
                                             drawerCollapsedWidth = 76,
                                         }: Props) {
    const theme = useTheme();
    const navigate = useNavigate();
    const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

    const {
        categories,
        setActiveCategoryKey,
        sidebarItemsMerged,
    } = useNavigationState(config);

    const collapsed = useUIStore((s) => s.sidebarCollapsed);
    const setCollapsed = useUIStore((s) => s.setSidebarCollapsed);
    const mobileOpen = useUIStore((s) => s.sidebarOpen);
    const setMobileOpen = useUIStore((s) => s.setSidebarOpen);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const [popoverAnchor, setPopoverAnchor] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
        if (isDesktop) {
            setMobileOpen(false);
        } else {
            setCollapsed(false);
        }
    }, [isDesktop, setMobileOpen, setCollapsed]);

    const effectiveDrawerWidth = collapsed ? drawerCollapsedWidth : drawerWidth;

    const handleToggleSidebar = () => {
        toggleSidebar(isDesktop);
    };

    const handleSelectCategory = (key: string) => {
        setActiveCategoryKey(key);
        const firstPage = config.sidebar.sections[key]?.[0];
        if (firstPage) navigate(firstPage.path);
    };

    return (
        <Box
            sx={{
                height: "100vh",
                width: "100%",
                overflow: "hidden",
                bgcolor: "background.default",
            }}
        >
            {config.layout.hasNavbar && (
                <NavigationNavbar
                    config={config}
                    categories={categories}
                    onSelectCategory={handleSelectCategory}
                    onToggleSidebar={handleToggleSidebar}
                    onOpenPopover={(el) => setPopoverAnchor(el)}
                    headerHeight={headerHeight}
                />
            )}

            {!isDesktop && config.layout.hasSidebar && (
                <NavigationSidebar
                    desktop={false}
                    headerHeight={headerHeight}
                    drawerWidth={drawerWidth}
                    items={sidebarItemsMerged}
                />
            )}

            <Box
                sx={{
                    display: "flex",
                    height: `calc(100vh - ${headerHeight}px)`,
                    mt: `${headerHeight}px`,
                    width: "100%",
                    overflow: "hidden",
                }}
            >
                {isDesktop && config.layout.hasSidebar && (
                    <NavigationSidebar
                        desktop
                        headerHeight={headerHeight}
                        drawerWidth={effectiveDrawerWidth}
                        items={sidebarItemsMerged}
                    />
                )}

                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        height: "100%",
                        overflowY: "auto",
                        overflowX: "hidden",
                        px: 0,
                        py: 0,
                    }}
                >
                    <Outlet />
                </Box>
            </Box>

            {config.layout.hasPopover && (
                <NavigationPopover
                    config={config}
                    anchorEl={popoverAnchor}
                    open={Boolean(popoverAnchor)}
                    onClose={() => setPopoverAnchor(null)}
                />
            )}
        </Box>
    );
}
