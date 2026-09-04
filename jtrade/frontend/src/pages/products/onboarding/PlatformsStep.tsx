import * as React from "react";
import { Alert, Avatar, Box, Checkbox, Chip, Paper, Stack, Typography } from "@mui/material";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";

import { QueryError } from "@/components/shared/QueryError";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePlatforms } from "@/hooks/api/usePlatforms";
import type { Product } from "@/types/products";
import { refId } from "@/types/products";

export function usePlatformsForm(product: Product | null) {
    const [ids, setIds] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (!product) return;
        setIds((product.platformIds ?? []).map((p) => refId(p)).filter(Boolean));
    }, [product]);

    const toggle = (id: string) =>
        setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const valid = ids.length > 0;
    const payload = () => ({ platformIds: [...new Set(ids)] });

    return { ids, toggle, valid, payload };
}

function PlatformCard({
    name,
    description,
    logoUrl,
    supported,
    checked,
    onToggle,
}: {
    name: string;
    description?: string;
    logoUrl?: string;
    supported?: boolean;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <Paper
            variant="outlined"
            onClick={onToggle}
            role="checkbox"
            aria-checked={checked}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggle();
                }
            }}
            sx={{
                p: 2,
                borderRadius: 2,
                cursor: "pointer",
                borderColor: checked ? "primary.main" : "divider",
                borderWidth: checked ? 2 : 1,
                bgcolor: checked ? "action.selected" : "transparent",
                transition: "border-color .12s, background-color .12s",
                "&:hover": { borderColor: checked ? "primary.main" : "text.disabled" },
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Checkbox checked={checked} tabIndex={-1} disableRipple sx={{ p: 0 }} />
                <Avatar src={logoUrl || undefined} variant="rounded" sx={{ width: 40, height: 40, bgcolor: "action.hover", flexShrink: 0 }}>
                    <LayersOutlinedIcon sx={{ color: "text.disabled" }} />
                </Avatar>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={800}>{name}</Typography>
                        {supported
                            ? <Chip size="small" color="success" variant="outlined" label="Supported by jtrade" />
                            : <Chip size="small" variant="outlined" label="Not supported yet" />}
                    </Stack>
                    {description && (
                        <Typography variant="body2" color="text.secondary">{description}</Typography>
                    )}
                </Box>
            </Stack>
        </Paper>
    );
}

/**
 * Step 5 of Product Onboarding. The provider declares every trading platform the
 * product operates on (MT4, MT5, cTrader…). At least one is required for
 * commercial readiness. Editable at any time — a provider can add platform
 * support later. This is NOT the ProductVersion technical target.
 */
export default function PlatformsStep({ form }: { form: ReturnType<typeof usePlatformsForm> }) {
    const { ids, toggle } = form;
    const q = usePlatforms({ active: true });
    const list = q.data ?? [];

    return (
        <Stack spacing={2} sx={{ maxWidth: 640 }}>
            <Typography variant="body2" color="text.secondary">
                Select every platform this product runs on. Customers use this to know whether the
                product is compatible with their setup. You can change it later.
            </Typography>

            {q.isLoading && <Typography color="text.secondary">Loading…</Typography>}
            {q.isError && (
                <QueryError message={(q.error as Error)?.message ?? "Could not load platforms."} onRetry={() => q.refetch()} />
            )}
            {!q.isLoading && !q.isError && list.length === 0 && (
                <EmptyState
                    title="No platforms available"
                    description="An administrator needs to add at least one platform to the catalogue."
                />
            )}

            {[...list]
                .sort((a, b) => Number(b.isSupported) - Number(a.isSupported) || a.name.localeCompare(b.name))
                .map((p) => (
                    <PlatformCard
                        key={p.id}
                        name={p.name}
                        description={p.description}
                        logoUrl={p.logoUrl}
                        supported={p.isSupported}
                        checked={ids.includes(p.id)}
                        onToggle={() => toggle(p.id)}
                    />
                ))}

            {list.length > 0 && ids.length === 0 && (
                <Alert severity="warning" variant="outlined">
                    Select at least one platform to complete this step.
                </Alert>
            )}
        </Stack>
    );
}
