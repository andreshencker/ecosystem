import type { ElementType, ReactNode } from "react";

export type RoleKey = "public" | "admin" | "client" | "provider";

export type LayoutFlags = {
    hasNavbar: boolean;
    hasSidebar: boolean;
    hasPopover: boolean;
};

export type NavLinkItem = {
    type: "link";
    label: string;
    path: string;
    icon?: ElementType;
};

export type NavCategoryItem = {
    type: "category";
    key: string; // e.g. "communications"
    label: string;
    icon?: ElementType;
};

export type NavbarItem = NavLinkItem | NavCategoryItem;

export type SidebarItem = {
    label: string;
    path: string;
    icon?: ElementType;
};

export type SidebarSections = Record<string, SidebarItem[]>;

export type PopoverAction = {
    key: string;
    label: string;
    to?: string; // si existe => link interno
    icon?: ElementType;
    dividerTop?: boolean;
    onClick?: () => void; // si no hay "to", ejecuta acción
};

export type NavigationPopoverConfig = {
    items: PopoverAction[];
    headerSlot?: ReactNode;
};

export type NavigationSlots = {
    /** si quieres render extra dentro del Popover (ej: platform accounts en client) */
    popoverBodySlot?: ReactNode;

    /** si quieres disparar modal TradingView desde popover */
    onOpenTradingView?: () => void;
};

export type NavigationConfig = {
    role: RoleKey;

    layout: LayoutFlags;

    /** items de navbar: links directos y/o categorías */
    navbar: NavbarItem[];

    /** sidebar depende de categoría activa */
    sidebar: {
        sections: SidebarSections;
    };

    /** items generales que siempre se agregan al final del sidebar */
    general: SidebarItem[];

    /** popover configurable */
    popover?: NavigationPopoverConfig;

    /** slots/handlers opcionales por rol */
    slots?: NavigationSlots;

    /** branding */
    brand?: {
        name: string;
        to?: string;
    };
};