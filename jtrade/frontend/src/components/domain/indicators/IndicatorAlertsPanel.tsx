import * as React from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import WebhookUrlCell from "@/components/shared/WebhookUrlCell";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { API_URL } from "@/lib/constants";
import { useAddChannel, useSetChannelEnabled } from "@/hooks/api/useIndicators";
import type { Indicator, Timeframe } from "@/types/indicator";
import type { SymbolItem } from "@/types/symbol";
import IndicatorAlertsList from "./IndicatorAlertsList";
import AlertPairForm from "./AlertPairForm";

const webhookUrl = (slug: string) => `${API_URL.replace(/\/$/, "")}/webhooks/tv/${slug}`;

/**
 * One indicator's webhook + alerts, as a self-contained card. Built entirely
 * from the existing Indicators/Alerts hooks and building blocks
 * (IndicatorAlertsList, AlertPairForm, WebhookUrlCell) — no new Alerts engine.
 * Used by the Product Onboarding "Alert Setup" step, scoped to one selected
 * indicator at a time.
 */
export default function IndicatorAlertsPanel({
    indicator,
    symbols,
}: {
    indicator: Indicator;
    symbols: SymbolItem[];
}) {
    const addChannel = useAddChannel();
    const setEnabled = useSetChannelEnabled();
    const [adding, setAdding] = React.useState(false);

    const pairs = indicator.pairs ?? [];
    const ready = pairs.some((p) => p.enabled === true);

    const submitAlert = async (values: { symbolId: string; timeframe: Timeframe }) => {
        if (!indicator.id) return;
        await addChannel.mutateAsync({ id: indicator.id, data: values });
        setAdding(false);
    };
    const toggleAlert = (channelId: string, enabled: boolean) => {
        if (!indicator.id) return;
        setEnabled.mutate({ id: indicator.id, channelId, enabled });
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800}>{indicator.name}</Typography>
                {ready ? (
                    <Chip
                        size="small" color="success" variant="outlined" icon={<CheckCircleRoundedIcon />}
                        label="Alert enabled"
                    />
                ) : (
                    <Chip
                        size="small" color="warning" variant="outlined" icon={<ErrorOutlineRoundedIcon />}
                        label="Requires at least one enabled alert"
                    />
                )}
            </Stack>

            {indicator.webhookSlug && (
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                        Webhook URL
                    </Typography>
                    <WebhookUrlCell url={webhookUrl(indicator.webhookSlug)} />
                </Box>
            )}

            <Typography
                variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase"
                sx={{ display: "block", mb: 0.5 }}
            >
                Alerts ({pairs.length})
            </Typography>
            <IndicatorAlertsList pairs={pairs} showKeys onToggle={toggleAlert} emptyLabel="No alerts configured yet." />

            <Box sx={{ mt: 1.5 }}>
                <Button
                    size="small" startIcon={<AddIcon />} onClick={() => setAdding(true)}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                >
                    Add alert
                </Button>
                <FormDrawer open={adding} onClose={() => setAdding(false)} title={`Add alert — ${indicator.name}`} width={440}>
                    <AlertPairForm
                        symbols={symbols} loading={addChannel.isPending}
                        onSubmit={submitAlert} onCancel={() => setAdding(false)}
                    />
                </FormDrawer>
            </Box>
        </Paper>
    );
}
