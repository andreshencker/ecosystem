import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
    Box, Button, Divider, FormControlLabel, Stack, Switch, TextField, Typography,
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import WebhookUrlCell from "@/components/shared/WebhookUrlCell";
import IndicatorAlertsList from "./IndicatorAlertsList";
import { API_URL } from "@/lib/constants";
import { type CreateIndicatorPayload, type Indicator } from "@/types/indicator";

type Props = {
    initial?: Indicator | null;
    loading?: boolean;
    onSubmit: (values: CreateIndicatorPayload) => void | Promise<void>;
    onCancel?: () => void;
    /** Enable/disable one alert channel. When absent, the alert list is display-only. */
    onToggleAlert?: (channelId: string, enabled: boolean) => void;
};

const slugify = (v: string) => v.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
const webhookUrl = (slug: string) => `${API_URL.replace(/\/$/, "")}/webhooks/tv/${slug}`;

export default function IndicatorForm({ initial, loading, onSubmit, onCancel, onToggleAlert }: Props) {
    const isEditing = !!initial;
    const navigate = useNavigate();

    const [name, setName] = React.useState("");
    const [key, setKey] = React.useState("");
    const [keyTouched, setKeyTouched] = React.useState(false);
    const [description, setDescription] = React.useState("");
    const [isActive, setIsActive] = React.useState(true);

    // Reset only when switching to a different indicator, so a channel toggle
    // (which refetches) doesn't wipe unsaved name/description edits.
    React.useEffect(() => {
        setName(initial?.name ?? "");
        setKey(initial?.key ?? "");
        setKeyTouched(!!initial);
        setDescription(initial?.description ?? "");
        setIsActive(initial?.isActive ?? true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?.id]);

    const effectiveKey = keyTouched ? key : slugify(name);
    const canSubmit = name.trim().length >= 2 && slugify(effectiveKey).length >= 2 && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        await onSubmit({
            name: name.trim(),
            key: slugify(effectiveKey),
            description: description.trim(),
            isActive,
        });
    };

    const alerts = initial?.pairs ?? [];

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit indicator" : "New indicator"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isEditing
                            ? "The key can't be changed after creation. Manage its alerts on the Alerts page."
                            : "Create the indicator, then add its symbol/timeframe alerts on the Alerts page."}
                    </Typography>
                </Box>

                <Divider />

                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)}
                    fullWidth required InputLabelProps={{ shrink: true }} />

                <TextField label="Key" value={effectiveKey}
                    onChange={(e) => { setKeyTouched(true); setKey(e.target.value); }}
                    fullWidth required disabled={isEditing} InputLabelProps={{ shrink: true }}
                    placeholder="fvg-engine"
                    helperText="Lowercase, unique within your organization. Auto-filled from the name." />

                <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)}
                    fullWidth multiline minRows={3} InputLabelProps={{ shrink: true }} />

                <FormControlLabel
                    control={<Switch size="small" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                    label={isActive ? "Active" : "Inactive"} />

                {isEditing && initial?.webhookSlug && (
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                            Webhook URL
                        </Typography>
                        <WebhookUrlCell url={webhookUrl(initial.webhookSlug)} />
                    </Box>
                )}

                {isEditing && (
                    <Box>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                                Alerts ({alerts.length})
                            </Typography>
                            <Button
                                size="small" variant="text" startIcon={<TuneRoundedIcon sx={{ fontSize: 16 }} />}
                                onClick={() => navigate(`/provider/alerts${initial?.id ? `?indicator=${initial.id}` : ""}`)}
                                sx={{ textTransform: "none", fontWeight: 700, minWidth: 0 }}
                            >
                                Manage alerts
                            </Button>
                        </Stack>
                        <Box sx={{ maxHeight: 200, overflowY: "auto", pr: 0.5 }}>
                            <IndicatorAlertsList pairs={alerts} onToggle={onToggleAlert} />
                        </Box>
                    </Box>
                )}

                <Divider />

                <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={!canSubmit}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        {isEditing ? "Save changes" : "Create"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
