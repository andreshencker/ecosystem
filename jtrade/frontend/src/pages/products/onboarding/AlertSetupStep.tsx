import * as React from "react";
import { Box, Button, Checkbox, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormDrawer } from "@/components/shared/FormDrawer";
import IndicatorForm from "@/components/domain/indicators/IndicatorForm";
import IndicatorAlertsPanel from "@/components/domain/indicators/IndicatorAlertsPanel";
import SymbolForm from "@/components/domain/symbols/SymbolForm";

import { useCreateIndicator, useIndicators } from "@/hooks/api/useIndicators";
import { useCreateSymbol, useSymbols } from "@/hooks/api/useSymbols";
import type { Product } from "@/types/products";
import { refId } from "@/types/products";
import type { Indicator } from "@/types/indicator";

/**
 * Everything a Signal product needs so it can actually generate and expose
 * alerts. Reuses the existing Symbols / Indicators / Alerts catalogues and
 * mutations end to end — nothing here is a second implementation of any of
 * the three. Only writes `Product.indicatorIds` (the existing relation);
 * Symbols and Alerts are never associated to the Product directly.
 */
export function useAlertSetupForm(product: Product | null) {
    const indicatorsQuery = useIndicators();
    const indicators = indicatorsQuery.data ?? [];
    const [ids, setIds] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (!product) return;
        setIds((product.indicatorIds ?? []).map((i) => refId(i)).filter(Boolean));
    }, [product]);

    const toggle = (id: string) =>
        setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    const select = (id: string) => setIds((cur) => (cur.includes(id) ? cur : [...cur, id]));

    /** Same rule the backend enforces: Indicator.pairs[].enabled === true. */
    const hasEnabledAlert = React.useCallback(
        (indicatorId: string) => {
            const indicator = indicators.find((i) => i.id === indicatorId);
            return (indicator?.pairs ?? []).some((pair) => pair.enabled === true);
        },
        [indicators],
    );

    const valid = ids.length > 0 && ids.every(hasEnabledAlert);
    const payload = () => ({ indicatorIds: [...new Set(ids)] });

    return { ids, toggle, select, valid, payload, hasEnabledAlert, indicators, indicatorsQuery };
}

function IndicatorSelectCard({
    indicator,
    checked,
    alertOk,
    onToggle,
}: {
    indicator: Indicator;
    checked: boolean;
    alertOk: boolean;
    onToggle: () => void;
}) {
    return (
        <Paper
            variant="outlined"
            onClick={onToggle}
            role="checkbox"
            aria-checked={checked}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
            sx={{
                p: 2, borderRadius: 2, cursor: "pointer",
                borderColor: checked ? "primary.main" : "divider",
                borderWidth: checked ? 2 : 1,
                bgcolor: checked ? "action.selected" : "transparent",
                transition: "border-color .12s, background-color .12s",
                "&:hover": { borderColor: checked ? "primary.main" : "text.disabled" },
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Checkbox checked={checked} tabIndex={-1} disableRipple sx={{ p: 0 }} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={800}>{indicator.name}</Typography>
                        {!indicator.isActive && <Chip size="small" variant="outlined" label="Inactive" />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">{indicator.key}</Typography>
                </Box>
                {checked && (
                    alertOk
                        ? <Chip size="small" color="success" variant="outlined" label="Alert ready" />
                        : <Chip size="small" color="warning" variant="outlined" label="Needs an alert" />
                )}
            </Stack>
        </Paper>
    );
}

export default function AlertSetupStep({ form }: { form: ReturnType<typeof useAlertSetupForm> }) {
    const { ids, toggle, select, hasEnabledAlert, indicators, indicatorsQuery } = form;

    const symbolsQuery = useSymbols();
    const createSymbol = useCreateSymbol();
    const createIndicator = useCreateIndicator();

    const [addingSymbol, setAddingSymbol] = React.useState(false);
    const [creatingIndicator, setCreatingIndicator] = React.useState(false);

    const activeIndicators = React.useMemo(
        () => [...indicators].filter((i) => i.isActive).sort((a, b) => a.name.localeCompare(b.name)),
        [indicators],
    );
    const selectedIndicators = React.useMemo(
        () => indicators.filter((i) => i.id && ids.includes(i.id)),
        [indicators, ids],
    );

    const submitSymbol = async (values: Parameters<typeof createSymbol.mutateAsync>[0]) => {
        await createSymbol.mutateAsync(values);
        setAddingSymbol(false);
    };
    const submitIndicator = async (values: Parameters<typeof createIndicator.mutateAsync>[0]) => {
        const created = await createIndicator.mutateAsync(values);
        if (created?.id) select(created.id);
        setCreatingIndicator(false);
    };

    return (
        <Stack spacing={3} sx={{ maxWidth: 800 }}>
            <Typography variant="body2" color="text.secondary">
                Signal products need at least one indicator, and every indicator you associate here
                must have at least one enabled alert. This is a shortcut into your organization's
                Symbols, Indicators and Alerts catalogues — manage them fully any time from the
                sidebar.
            </Typography>

            {/* ── Symbols ─────────────────────────────────────────────────── */}
            <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>Symbols</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Make sure the symbols you'll need for alerts already exist.
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    {(symbolsQuery.data ?? []).map((s) => (
                        <Chip key={s.id} size="small" variant="outlined" label={s.symbol} sx={{ opacity: s.isActive ? 1 : 0.5 }} />
                    ))}
                    {!symbolsQuery.isFetching && (symbolsQuery.data ?? []).length === 0 && (
                        <Typography variant="caption" color="text.disabled">No symbols yet.</Typography>
                    )}
                </Stack>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setAddingSymbol(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
                    Add symbol
                </Button>
                <FormDrawer open={addingSymbol} onClose={() => setAddingSymbol(false)} title="New symbol">
                    <SymbolForm loading={createSymbol.isPending} onSubmit={submitSymbol} onCancel={() => setAddingSymbol(false)} />
                </FormDrawer>
            </Box>

            <Divider />

            {/* ── Indicators ──────────────────────────────────────────────── */}
            <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>Indicators</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Select every indicator this product delivers signals for.
                </Typography>

                {indicatorsQuery.isLoading && <Typography color="text.secondary">Loading…</Typography>}
                {!indicatorsQuery.isLoading && activeIndicators.length === 0 && (
                    <EmptyState title="No indicators yet" description="Create one below to get started." />
                )}

                <Stack spacing={1}>
                    {activeIndicators.map((ind) => (
                        <IndicatorSelectCard
                            key={ind.id}
                            indicator={ind}
                            checked={!!ind.id && ids.includes(ind.id)}
                            alertOk={!!ind.id && hasEnabledAlert(ind.id)}
                            onToggle={() => ind.id && toggle(ind.id)}
                        />
                    ))}
                </Stack>

                <Box sx={{ mt: 1.5 }}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCreatingIndicator(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
                        Create indicator
                    </Button>
                    <FormDrawer open={creatingIndicator} onClose={() => setCreatingIndicator(false)} title="New indicator">
                        <IndicatorForm loading={createIndicator.isPending} onSubmit={submitIndicator} onCancel={() => setCreatingIndicator(false)} />
                    </FormDrawer>
                </Box>
            </Box>

            <Divider />

            {/* ── Alerts — scoped to the indicators selected above only ──────── */}
            <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>Alerts</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    One alert = one symbol on one timeframe. jtrade mints its BUY / SELL keys.
                </Typography>

                {selectedIndicators.length === 0 ? (
                    <Typography variant="caption" color="text.disabled">Select an indicator above first.</Typography>
                ) : (
                    <Stack spacing={2}>
                        {selectedIndicators.map((ind) => (
                            <IndicatorAlertsPanel key={ind.id} indicator={ind} symbols={symbolsQuery.data ?? []} />
                        ))}
                    </Stack>
                )}
            </Box>
        </Stack>
    );
}
