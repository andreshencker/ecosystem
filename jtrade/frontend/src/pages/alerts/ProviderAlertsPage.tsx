import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
    Box, Button, Chip, Divider, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Switch,
    TextField, Tooltip, Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import CopyableCode from "@/components/shared/CopyableCode";
import WebhookUrlCell from "@/components/shared/WebhookUrlCell";

import {
    useAddChannel, useIndicators, useRemoveChannel, useRotateChannelKeys, useRotateIndicatorWebhook, useSetChannelEnabled,
} from "@/hooks/api/useIndicators";
import { useSymbols } from "@/hooks/api/useSymbols";
import { API_URL } from "@/lib/constants";
import { TIMEFRAMES, type Timeframe } from "@/types/indicator";

type AlertRow = {
    id: string;
    symbolId: string;
    symbol: string;
    timeframe: string;
    buyKey: string;
    sellKey: string;
    enabled: boolean;
};

const webhookUrl = (slug: string) => `${API_URL.replace(/\/$/, "")}/webhooks/tv/${slug}`;

export default function ProviderAlertsPage() {
    const indicatorsQuery = useIndicators();
    const symbolsQuery = useSymbols();
    const setEnabled = useSetChannelEnabled();
    const rotateKeys = useRotateChannelKeys();
    const rotateWebhook = useRotateIndicatorWebhook();
    const addChannel = useAddChannel();
    const removeChannel = useRemoveChannel();

    const indicators = indicatorsQuery.data ?? [];
    const symbols = React.useMemo(
        () => (symbolsQuery.data ?? []).filter((s) => s.isActive).sort((a, b) => a.symbol.localeCompare(b.symbol)),
        [symbolsQuery.data],
    );

    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedId, setSelectedId] = React.useState<string>(searchParams.get("indicator") ?? "");
    const [openId, setOpenId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (indicators.length === 0) return;
        const valid = indicators.some((i) => i.id === selectedId);
        if (!valid) setSelectedId(indicators[0].id ?? "");
    }, [indicators, selectedId]);

    const pickIndicator = (id: string) => {
        setSelectedId(id);
        setOpenId(null);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (id) next.set("indicator", id); else next.delete("indicator");
            return next;
        }, { replace: true });
    };

    const indicator = indicators.find((i) => i.id === selectedId) ?? null;

    const rows = React.useMemo<AlertRow[]>(
        () =>
            (indicator?.pairs ?? []).map((p) => ({
                id: p.id ?? `${p.symbolId}:${p.timeframe}`,
                symbolId: p.symbolId,
                symbol: p.symbol || "?",
                timeframe: p.timeframe,
                buyKey: p.buyKey ?? "",
                sellKey: p.sellKey ?? "",
                enabled: p.enabled !== false,
            })),
        [indicator],
    );

    const selected = openId ? rows.find((r) => r.id === openId) ?? null : null;

    const [adding, setAdding] = React.useState(false);
    const [draft, setDraft] = React.useState<{ symbolId: string; timeframe: Timeframe }>({ symbolId: "", timeframe: "M15" });
    const [pendingDelete, setPendingDelete] = React.useState<AlertRow | null>(null);

    const openAdd = () => { setDraft({ symbolId: "", timeframe: "M15" }); setAdding(true); };
    const submitAdd = async () => {
        if (!indicator?.id || !draft.symbolId) return;
        await addChannel.mutateAsync({ id: indicator.id, data: { symbolId: draft.symbolId, timeframe: draft.timeframe } });
        setAdding(false);
    };
    const confirmDelete = async () => {
        if (!pendingDelete || !indicator?.id) return;
        await removeChannel.mutateAsync({ id: indicator.id, channelId: pendingDelete.id });
        if (openId === pendingDelete.id) setOpenId(null);
        setPendingDelete(null);
    };
    const toggle = (row: AlertRow, next: boolean) => {
        if (!indicator?.id) return;
        setEnabled.mutate({ id: indicator.id, channelId: row.id, enabled: next });
    };
    const rotateRowKeys = (row: AlertRow) => {
        if (!indicator?.id) return;
        rotateKeys.mutate({ id: indicator.id, channelId: row.id });
    };

    const columns: GridColDef<AlertRow>[] = [
        {
            field: "symbol", headerName: "Symbol", width: 130,
            renderCell: (p) => <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{p.row.symbol}</Typography>,
        },
        { field: "timeframe", headerName: "Timeframe", width: 110 },
        {
            field: "enabled", headerName: "On", width: 70, sortable: false,
            renderCell: (p) => (
                <Switch
                    size="small" checked={p.row.enabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => toggle(p.row, e.target.checked)}
                />
            ),
        },
        {
            field: "buyKey", headerName: "BUY key", flex: 1, minWidth: 130, sortable: false,
            renderCell: (p) => <CopyableCode value={p.row.buyKey} label="BUY key" />,
        },
        {
            field: "sellKey", headerName: "SELL key", flex: 1, minWidth: 130, sortable: false,
            renderCell: (p) => <CopyableCode value={p.row.sellKey} label="SELL key" />,
        },
        {
            field: "actions", headerName: "", width: 92, sortable: false, filterable: false,
            renderCell: (p) => (
                <>
                    <Tooltip title="Rotate keys">
                        <span>
                            <IconButton
                                size="small" disabled={rotateKeys.isPending}
                                onClick={(e) => { e.stopPropagation(); rotateRowKeys(p.row); }}
                                aria-label="Rotate keys"
                            >
                                <AutorenewIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Delete alert">
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setPendingDelete(p.row); }}
                            aria-label="Delete alert"
                        >
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Alerts"
                subtitle="One alert = one symbol on one timeframe, with its own BUY / SELL key for TradingView."
            />

            {indicators.length === 0 ? (
                <EmptyState title="No indicators yet" description="Create an indicator first, then add its alerts here." />
            ) : (
                <>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                            <InputLabel>Indicator</InputLabel>
                            <Select value={selectedId} label="Indicator" onChange={(e) => pickIndicator(e.target.value)}>
                                {indicators.map((i) => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Box sx={{ flex: 1 }} />
                        <LoadingButton
                            variant="contained" startIcon={<AddIcon />} onClick={openAdd}
                            disabled={!indicator}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                            Add alert
                        </LoadingButton>
                    </Stack>

                    {indicator && (
                        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, mb: 2 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                                Webhook URL — {indicator.name}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                                {indicator.webhookSlug
                                    ? <WebhookUrlCell url={webhookUrl(indicator.webhookSlug)} />
                                    : <Typography variant="caption" color="text.disabled">Not generated yet.</Typography>}
                            </Box>
                            <LoadingButton
                                variant="outlined" color="warning" size="small" startIcon={<AutorenewIcon />}
                                loading={rotateWebhook.isPending} disabled={!indicator.id}
                                onClick={() => indicator.id && rotateWebhook.mutate(indicator.id)}
                                sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
                            >
                                Rotate webhook URL
                            </LoadingButton>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
                                Invalidates every TradingView alert for this indicator.
                            </Typography>
                        </Box>
                    )}

                    <DataTable<AlertRow>
                        columns={columns}
                        rows={rows}
                        total={rows.length}
                        page={0}
                        pageSize={50}
                        onPageChange={() => {}}
                        onPageSizeChange={() => {}}
                        loading={indicatorsQuery.isFetching}
                        getRowId={(row) => row.id}
                        onRowClick={(row) => setOpenId(row.id)}
                        error={indicatorsQuery.isError ? (indicatorsQuery.error as Error) : null}
                        emptyState={
                            <EmptyState
                                title="No alerts on this indicator"
                                description="Add a symbol/timeframe and jtrade mints its BUY / SELL keys."
                            />
                        }
                        mobileCardConfig={{
                            primaryText: (row) => `${row.symbol} ${row.timeframe}`,
                            secondaryText: (row) => (row.enabled ? "On" : "Off"),
                            badge: (row) => <Chip size="small" color={row.enabled ? "success" : "default"} label={row.enabled ? "On" : "Off"} />,
                            fields: [
                                { field: "buyKey", label: "BUY", render: (v) => String(v || "—") },
                                { field: "sellKey", label: "SELL", render: (v) => String(v || "—") },
                            ],
                        }}
                    />
                </>
            )}

            <FormDrawer
                open={!!selected}
                onClose={() => setOpenId(null)}
                title={selected ? `${selected.symbol} · ${selected.timeframe}` : "Alert"}
                width={520}
            >
                {selected && indicator && (
                    <Stack spacing={2.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Switch size="small" checked={selected.enabled} onChange={(e) => toggle(selected, e.target.checked)} />
                            <Typography variant="body2">{selected.enabled ? "Enabled" : "Disabled"}</Typography>
                        </Stack>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Keys</Typography>
                            <Stack spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip size="small" color="success" label="BUY" sx={{ fontWeight: 800, width: 56 }} />
                                    <CopyableCode value={selected.buyKey} label="BUY key" full />
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip size="small" color="warning" label="SELL" sx={{ fontWeight: 800, width: 56 }} />
                                    <CopyableCode value={selected.sellKey} label="SELL key" full />
                                </Stack>
                            </Stack>
                            <LoadingButton
                                variant="outlined" color="warning" size="small" startIcon={<AutorenewIcon />}
                                loading={rotateKeys.isPending}
                                onClick={() => rotateRowKeys(selected)}
                                sx={{ mt: 1.5, textTransform: "none", fontWeight: 700 }}
                            >
                                Rotate keys
                            </LoadingButton>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>TradingView setup</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                                Point both alerts at the indicator's webhook URL. Use the BUY payload in your buy alert, the SELL payload in your sell alert.
                            </Typography>
                            {indicator.webhookSlug && (
                                <>
                                    <WebhookUrlCell url={webhookUrl(indicator.webhookSlug)} />
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.5 }}>
                                        Alert message — BUY
                                    </Typography>
                                    <CopyableCode value={`{"key":"${selected.buyKey}"}`} label="BUY payload" full />
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, mb: 0.5 }}>
                                        Alert message — SELL
                                    </Typography>
                                    <CopyableCode value={`{"key":"${selected.sellKey}"}`} label="SELL payload" full />
                                </>
                            )}
                        </Box>
                    </Stack>
                )}
            </FormDrawer>

            <FormDrawer open={adding} onClose={() => setAdding(false)} title={`Add alert — ${indicator?.name ?? ""}`} width={440}>
                <Stack spacing={2.5}>
                    <Typography variant="body2" color="text.secondary">
                        One symbol on one timeframe. jtrade mints its own BUY / SELL keys.
                    </Typography>
                    <TextField
                        select label="Symbol" value={draft.symbolId} fullWidth InputLabelProps={{ shrink: true }}
                        onChange={(e) => setDraft((d) => ({ ...d, symbolId: e.target.value }))}
                        helperText={symbols.length === 0 ? "No active symbols — add some in Symbols first." : " "}
                    >
                        {symbols.map((s) => <MenuItem key={s.id} value={s.id}>{s.symbol}</MenuItem>)}
                    </TextField>
                    <TextField
                        select label="Timeframe" value={draft.timeframe} fullWidth InputLabelProps={{ shrink: true }}
                        onChange={(e) => setDraft((d) => ({ ...d, timeframe: e.target.value as Timeframe }))}
                    >
                        {TIMEFRAMES.map((tf) => <MenuItem key={tf} value={tf}>{tf}</MenuItem>)}
                    </TextField>
                    <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                        <Button variant="outlined" color="inherit" onClick={() => setAdding(false)}
                            sx={{ textTransform: "none", fontWeight: 800 }}>
                            Cancel
                        </Button>
                        <LoadingButton
                            variant="contained" loading={addChannel.isPending} disabled={!draft.symbolId}
                            onClick={submitAdd} sx={{ textTransform: "none", fontWeight: 800 }}
                        >
                            Add alert
                        </LoadingButton>
                    </Stack>
                </Stack>
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete alert"
                description={
                    pendingDelete
                        ? `"${pendingDelete.symbol} ${pendingDelete.timeframe}" will be removed. Its BUY / SELL keys stop working.`
                        : undefined
                }
                confirmLabel="Delete"
                danger
                loading={removeChannel.isPending}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
