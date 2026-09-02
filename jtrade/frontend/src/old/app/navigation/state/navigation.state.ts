import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { NavigationConfig, NavbarItem } from "../types";
import { useUIStore } from "@/stores/ui.store";

export function useNavigationState(cfg: NavigationConfig) {
    const { pathname } = useLocation();
    const categories = useMemo(
        () =>
            cfg.navbar.filter(
                (x): x is Extract<NavbarItem, { type: "category" }> => x.type === "category",
            ),
        [cfg.navbar],
    );

    const activeCategoryKey = useUIStore((s) => s.activeCategoryKey);
    const setActiveCategoryKey = useUIStore((s) => s.setActiveCategoryKey);

    useEffect(() => {
        const routeCategory = categories.find(category =>
            (cfg.sidebar.sections[category.key] ?? []).some(item =>
                pathname === item.path || pathname.startsWith(item.path + "/"),
            ),
        );
        setActiveCategoryKey(routeCategory?.key ?? categories[0]?.key ?? null);
    }, [categories, cfg.sidebar.sections, pathname, setActiveCategoryKey]);

    const sidebarItemsForActiveCategory = useMemo(() => {
        if (!activeCategoryKey) return [];
        return cfg.sidebar.sections[activeCategoryKey] ?? [];
    }, [cfg.sidebar.sections, activeCategoryKey]);

    const sidebarItemsMerged = useMemo(() => {
        const merged = [...sidebarItemsForActiveCategory, ...cfg.general];
        // evitar duplicados por path
        const seen = new Set<string>();
        return merged.filter((it) => {
            if (seen.has(it.path)) return false;
            seen.add(it.path);
            return true;
        });
    }, [sidebarItemsForActiveCategory, cfg.general]);

    return {
        categories,
        activeCategoryKey,
        setActiveCategoryKey,
        sidebarItemsForActiveCategory,
        sidebarItemsMerged,
    };
}
