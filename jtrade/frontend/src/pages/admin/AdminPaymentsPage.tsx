import * as React from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import { PageHeader } from "@/components/shared/PageHeader";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { QueryError } from "@/components/shared/QueryError";
import { EmptyState } from "@/components/shared/EmptyState";
import {
    useAdminPaymentMethods,
    useUpsertPaymentMethod,
} from "@/hooks/api/usePaymentsAdmin";
import type { AdminPaymentMethod, SettingsFieldDef } from "@/types/payments-admin";

function settingToInput(field: SettingsFieldDef, value: unknown): string {
    if (field.type === "country-list") {
        return Array.isArray(value) ? value.join(", ") : "";
    }
    return value === undefined || value === null ? "" : String(value);
}

function inputToSetting(field: SettingsFieldDef, raw: string): unknown {
    if (field.type === "country-list") {
        return raw
            .split(/[,\s]+/)
            .map((c) => c.trim().toUpperCase())
            .filter(Boolean);
    }
    if (field.type === "number") return raw === "" ? undefined : Number(raw);
    return raw.trim();
}

export default function AdminPaymentsPage() {
    const list = useAdminPaymentMethods();
    const save = useUpsertPaymentMethod();
    const [editing, setEditing] = React.useState<AdminPaymentMethod | null>(null);
    const [form, setForm] = React.useState<Record<string, string>>({});

    const openConfig = (m: AdminPaymentMethod) => {
        setEditing(m);
        setForm(
            Object.fromEntries(
                m.settingsFields.map((f) => [f.key, settingToInput(f, m.settings[f.key])]),
            ),
        );
    };

    const saveConfig = () => {
        if (!editing) return;
        const settings = Object.fromEntries(
            editing.settingsFields.map((f) => [f.key, inputToSetting(f, form[f.key] ?? "")]),
        );
        save.mutate(
            { method: editing.method, body: { settings } },
            { onSuccess: () => setEditing(null) },
        );
    };

    const toggle = (m: AdminPaymentMethod, patch: { enabled?: boolean; isRequired?: boolean }) => {
        save.mutate({ method: m.method, body: patch });
    };

    return (
        <>
            <PageHeader
                title="Payments"
                subtitle="Choose which of Relay's payment methods jtrade offers to providers, and set what each one needs."
            />

            {list.isLoading && <Typography color="text.secondary">Loading…</Typography>}
            {list.isError && (
                <QueryError
                    message={(list.error as Error)?.message ?? "Could not load payment methods."}
                    onRetry={() => list.refetch()}
                />
            )}

            {list.data && list.data.length === 0 && (
                <EmptyState title="No payment methods" description="Relay isn't advertising any payment providers." />
            )}

            {list.data && list.data.length > 0 && (
                <Stack spacing={1.5} maxWidth={720}>
                    {list.data.map((m) => (
                        <Card key={m.method} variant="outlined">
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                                    <Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                {m.displayName}
                                            </Typography>
                                            {m.isRequired && <Chip size="small" label="Required" color="primary" />}
                                            {!m.supportedByRelay && (
                                                <Chip size="small" color="warning" variant="outlined" label="Not in Relay" />
                                            )}
                                        </Box>
                                        {m.description && (
                                            <Typography variant="body2" color="text.secondary">{m.description}</Typography>
                                        )}
                                    </Box>

                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {m.configurable && (
                                            <LoadingButton
                                                size="small"
                                                variant="outlined"
                                                onClick={() => openConfig(m)}
                                            >
                                                Configure
                                            </LoadingButton>
                                        )}
                                        <Switch
                                            checked={m.enabled}
                                            onChange={(e) => toggle(m, { enabled: e.target.checked })}
                                            disabled={!m.supportedByRelay}
                                        />
                                    </Stack>
                                </Box>

                                {m.enabled && (
                                    <Box mt={1} display="flex" alignItems="center" gap={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            Base method (providers must have this first)
                                        </Typography>
                                        <Switch
                                            size="small"
                                            checked={m.isRequired}
                                            onChange={(e) => toggle(m, { isRequired: e.target.checked })}
                                        />
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}

            <FormDrawer
                open={!!editing}
                onClose={() => setEditing(null)}
                title={editing ? `Configure ${editing.displayName}` : ""}
                actions={
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <LoadingButton onClick={() => setEditing(null)}>Cancel</LoadingButton>
                        <LoadingButton variant="contained" loading={save.isPending} onClick={saveConfig}>
                            Save
                        </LoadingButton>
                    </Stack>
                }
            >
                {editing && (
                    <Stack spacing={2.5}>
                        {editing.settingsFields.map((f) => (
                            <TextField
                                key={f.key}
                                label={f.label}
                                required={f.required}
                                helperText={
                                    f.type === "country-list"
                                        ? f.help ?? "2-letter codes, comma separated (e.g. US, GB, CO)"
                                        : f.help
                                }
                                value={form[f.key] ?? ""}
                                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                                type={f.type === "number" ? "number" : "text"}
                                fullWidth
                                size="small"
                            />
                        ))}
                        {editing.settingsFields.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                This method has no settings to configure.
                            </Typography>
                        )}
                    </Stack>
                )}
            </FormDrawer>
        </>
    );
}
