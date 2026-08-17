'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useConfiguredChannels } from '@/hooks/api/useProviderCredentials';
import { getRoleConfig, type SidebarTabConfig } from '@/config/rbac/role-config';

function findBestMatch(pathname: string, hrefs: string[]): string | null {
  if (hrefs.includes(pathname)) return pathname;
  const prefixMatches = hrefs
    .filter((h) => pathname.startsWith(h + '/'))
    .sort((a, b) => b.length - a.length);
  return prefixMatches[0] ?? null;
}

// Shared between Topbar (renders the tab row) and Sidebar (renders the
// active tab's pages) — keeps "which channel tab is active" in one place,
// driven by the current route.
export function useChannelTabs() {
  const role = useAuthStore((s) => s.role);
  const pathname = usePathname();
  const router = useRouter();
  const activeChannelTab = useUIStore((s) => s.activeChannelTab);
  const setActiveChannelTab = useUIStore((s) => s.setActiveChannelTab);

  // Undefined while loading (or for roles with no channel tabs at all) —
  // default to [] so only tabs with no requiresChannel (e.g. Setup) show
  // until we know what's actually configured. Avoids a flash of tabs that
  // then disappear once the real list arrives.
  const { data: configured } = useConfiguredChannels();
  const configuredChannels = configured?.channels ?? [];
  const configuredProviderKeys = configured?.providerKeys ?? [];

  const allTabs: SidebarTabConfig[] = role ? getRoleConfig(role).sidebarTabs : [];
  const tabs = allTabs.filter(
    (tab) =>
      (!tab.requiresChannel ||
        tab.requiresChannel.some((channel) => configuredChannels.includes(channel))) &&
      (!tab.requiresProviderKey ||
        tab.requiresProviderKey.some((key) => configuredProviderKeys.includes(key))),
  );

  useEffect(() => {
    const matched = tabs.find((tab) => findBestMatch(pathname, tab.items.map((i) => i.href)));
    if (matched && matched.key !== activeChannelTab) setActiveChannelTab(matched.key);
    // Only re-sync when the route or the available tabs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, tabs]);

  const activeKey = activeChannelTab || tabs[0]?.key || '';
  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  function selectTab(key: string) {
    const tab = tabs.find((t) => t.key === key);
    setActiveChannelTab(key);
    if (tab?.items[0]) router.push(tab.items[0].href);
  }

  return { tabs, activeKey, activeTab, selectTab };
}
