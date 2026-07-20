// FILE: src/modules/alerts/utils/groupAlerts.ts

import type { Alert, AlertGroupRow } from "../types/alerts";

export function groupAlerts(alerts: Alert[]): AlertGroupRow[] {
    const map = new Map<string, Alert[]>();

    for (const a of alerts ?? []) {
        const groupId = a.groupId ?? "NO_GROUP";
        if (!map.has(groupId)) map.set(groupId, []);
        map.get(groupId)!.push(a);
    }

    const rows: AlertGroupRow[] = [];

    for (const [groupId, items] of map.entries()) {
        const buy = items.find((x) => x.action === "BUY") ?? items[0];

        rows.push({
            groupId,
            id: buy.id ?? (buy as any)._id,

            indicatorId: buy.indicatorId,

            symbol: buy.symbol,
            timeframe: buy.timeFrame, // backend -> UI

            isActive: !!buy.isActive,

            indicator: buy.indicator
                ? {
                    id: buy.indicator.id ?? buy.indicator._id,
                    name: buy.indicator.name,
                    key: buy.indicator.key,
                }
                : undefined,
        });
    }

    // optional stable sort
    return rows.sort((a, b) => {
        const s = a.symbol.localeCompare(b.symbol);
        if (s !== 0) return s;
        return a.timeframe.localeCompare(b.timeframe);
    });
}