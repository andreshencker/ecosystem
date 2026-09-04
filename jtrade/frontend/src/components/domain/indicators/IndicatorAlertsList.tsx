import * as React from "react";
import { Box, Switch, Typography } from "@mui/material";

import CopyableCode from "@/components/shared/CopyableCode";
import type { IndicatorPair } from "@/types/indicator";

/**
 * Compact list of one indicator's alert channels (symbol + timeframe, with an
 * enable/disable toggle). Extracted from IndicatorForm so the same rendering
 * is reused by the Product Onboarding "Alert Setup" step — no second engine.
 */
export default function IndicatorAlertsList({
    pairs,
    showKeys = false,
    onToggle,
    emptyLabel = "No alerts yet.",
}: {
    pairs: IndicatorPair[];
    /** Show the BUY/SELL keys inline (the wizard needs them; the compact
     * Indicators-page drawer keeps them off to stay short). */
    showKeys?: boolean;
    onToggle?: (channelId: string, enabled: boolean) => void;
    emptyLabel?: string;
}) {
    if (pairs.length === 0) {
        return <Typography variant="caption" color="text.disabled">{emptyLabel}</Typography>;
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {pairs.map((p) => (
                <Box
                    key={p.id ?? `${p.symbolId}:${p.timeframe}`}
                    sx={{
                        display: "flex", alignItems: "center", gap: 1, flexWrap: showKeys ? "wrap" : "nowrap",
                        border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1, py: 0.5,
                    }}
                >
                    <Typography sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, flexShrink: 0 }} noWrap>
                        {p.symbol || "?"}
                        <Box component="span" sx={{ color: "text.disabled", fontWeight: 400, ml: 0.5 }}>
                            {p.timeframe}
                        </Box>
                    </Typography>

                    {showKeys && (
                        <Box sx={{ display: "flex", gap: 1.5, flexGrow: 1, minWidth: 220 }}>
                            <CopyableCode value={p.buyKey} label="BUY key" />
                            <CopyableCode value={p.sellKey} label="SELL key" />
                        </Box>
                    )}

                    <Box sx={{ flexGrow: showKeys ? 0 : 1 }} />
                    <Switch
                        size="small"
                        checked={p.enabled !== false}
                        disabled={!onToggle || !p.id}
                        onChange={(e) => p.id && onToggle?.(p.id, e.target.checked)}
                    />
                </Box>
            ))}
        </Box>
    );
}
