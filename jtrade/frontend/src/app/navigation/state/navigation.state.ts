import { useEffect, useMemo, useState } from "react";
import type { NavigationConfig, NavbarItem } from "../types";

export function useNavigationState(cfg: NavigationConfig) {
    const categories = useMemo(
        () =>
            cfg.navbar.filter(
                (x): x is Extract<NavbarItem, { type: "category" }> => x.type === "category",
            ),
        [cfg.navbar],
    );

    const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);

    useEffect(() => {
        // default: primera categoría si existe
        setActiveCategoryKey(categories[0]?.key ?? null);
    }, [categories]);

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