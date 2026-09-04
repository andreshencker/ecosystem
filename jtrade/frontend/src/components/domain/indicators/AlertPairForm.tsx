import * as React from "react";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";

import { LoadingButton } from "@/components/shared/LoadingButton";
import { TIMEFRAMES, type Timeframe } from "@/types/indicator";
import type { SymbolItem } from "@/types/symbol";

/**
 * "New alert" form — one symbol + one timeframe. jtrade mints the BUY/SELL
 * keys server-side (POST /indicators/:id/channels). Full-width vertical
 * fields, meant to sit inside a FormDrawer — the exact same shape as
 * ProviderAlertsPage's own "Add alert" drawer, so both can share it.
 */
export default function AlertPairForm({
    symbols,
    loading,
    onSubmit,
    onCancel,
}: {
    symbols: SymbolItem[];
    loading?: boolean;
    onSubmit: (values: { symbolId: string; timeframe: Timeframe }) => void | Promise<void>;
    onCancel?: () => void;
}) {
    const [symbolId, setSymbolId] = React.useState("");
    const [timeframe, setTimeframe] = React.useState<Timeframe>("M15");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symbolId) return;
        await onSubmit({ symbolId, timeframe });
        setSymbolId("");
    };

    return (
        <Stack component="form" onSubmit={submit} spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
                One symbol on one timeframe. jtrade mints its own BUY / SELL keys.
            </Typography>
            <TextField
                select label="Symbol" value={symbolId} fullWidth InputLabelProps={{ shrink: true }}
                onChange={(e) => setSymbolId(e.target.value)}
                helperText={symbols.length === 0 ? "No active symbols — add some in Symbols first." : " "}
            >
                {symbols.map((s) => <MenuItem key={s.id} value={s.id}>{s.symbol}</MenuItem>)}
            </TextField>
            <TextField
                select label="Timeframe" value={timeframe} fullWidth InputLabelProps={{ shrink: true }}
                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            >
                {TIMEFRAMES.map((tf) => <MenuItem key={tf} value={tf}>{tf}</MenuItem>)}
            </TextField>
            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                {onCancel && (
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading} sx={{ textTransform: "none", fontWeight: 800 }}>
                        Cancel
                    </Button>
                )}
                <LoadingButton
                    type="submit" variant="contained" loading={loading} disabled={!symbolId}
                    sx={{ textTransform: "none", fontWeight: 800 }}
                >
                    Add alert
                </LoadingButton>
            </Stack>
        </Stack>
    );
}
