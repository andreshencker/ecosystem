import * as React from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Outlet } from "react-router-dom";
import type { NavigationConfig } from "../types";
import { useNavigationState } from "../state/navigation.state";
import NavigationNavbar from "./NavigationNavbar";
import NavigationSidebar from "./NavigationSidebar";
import NavigationPopover from "./NavigationPopover";

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
    const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

    const {
        categories,
        activeCategoryKey,
        setActiveCategoryKey,
        sidebarItemsMerged,
    } = useNavigationState(config);

    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [popoverAnchor, setPopoverAnchor] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
        if (isDesktop) {
            setMobileOpen(false);
        } else {
            setCollapsed(false);
        }
    }, [isDesktop]);

    const effectiveDrawerWidth = collapsed ? drawerCollapsedWidth : drawerWidth;

    const handleToggleSidebar = () => {
        if (isDesktop) {
            setCollapsed((prev) => !prev);
        } else {
            setMobileOpen((prev) => !prev);
        }
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
                    activeCategoryKey={activeCategoryKey}
                    onSelectCategory={setActiveCategoryKey}
                    onToggleSidebar={handleToggleSidebar}
                    onOpenPopover={(el) => setPopoverAnchor(el)}
                    headerHeight={headerHeight}
                />
            )}

            {!isDesktop && config.layout.hasSidebar && (
                <NavigationSidebar
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    desktop={false}
                    headerHeight={headerHeight}
                    drawerWidth={drawerWidth}
                    collapsed={false}
                    items={sidebarItemsMerged}
                    activeCategoryKey={activeCategoryKey}
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
                        open
                        onClose={() => {}}
                        desktop
                        headerHeight={headerHeight}
                        drawerWidth={effectiveDrawerWidth}
                        collapsed={collapsed}
                        items={sidebarItemsMerged}
                        activeCategoryKey={activeCategoryKey}
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