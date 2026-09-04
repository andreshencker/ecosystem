import * as React from "react";
import { Alert, Avatar, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";

import { QueryError } from "@/components/shared/QueryError";
import { EmptyState } from "@/components/shared/EmptyState";
import { useActiveProductTypes } from "@/hooks/api/useProductTypes";
import type { ProductType } from "@/types/productTypes";

type CardType = { name: string; shortDescription?: string; description?: string; iconUrl?: string };

const sortTypes = (list: ProductType[]) =>
    [...list].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

/** A read-only or selectable card for one product type. */
function TypeCard({
    type,
    selected,
    locked,
    inactive,
    onSelect,
}: {
    type: CardType;
    selected: boolean;
    locked?: boolean;
    inactive?: boolean;
    onSelect?: () => void;
}) {
    const Radio = selected ? RadioButtonCheckedRoundedIcon : RadioButtonUncheckedRoundedIcon;
    return (
        <Paper
            variant="outlined"
            onClick={locked ? undefined : onSelect}
            role={locked ? undefined : "radio"}
            aria-checked={selected}
            tabIndex={locked ? undefined : 0}
            onKeyDown={locked ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(); } }}
            sx={{
                p: 2.5,
                borderRadius: 2,
                cursor: locked ? "default" : "pointer",
                borderColor: selected ? "primary.main" : "divider",
                borderWidth: selected ? 2 : 1,
                bgcolor: selected ? "action.selected" : "transparent",
                transition: "border-color .12s, background-color .12s",
                "&:hover": locked ? undefined : { borderColor: selected ? "primary.main" : "text.disabled" },
            }}
        >
            <Stack direction="row" spacing={2} alignItems="flex-start">
                {!locked && <Radio sx={{ fontSize: 20, color: selected ? "primary.main" : "text.disabled", mt: 0.25 }} />}
                <Avatar src={type.iconUrl || undefined} variant="rounded" sx={{ width: 48, height: 48, bgcolor: "action.hover", flexShrink: 0 }}>
                    <CategoryOutlinedIcon sx={{ color: "text.disabled" }} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={900}>{type.name}</Typography>
                        {inactive && <Chip size="small" variant="outlined" label="Inactive for new products" />}
                    </Stack>
                    {type.shortDescription && (
                        <Typography variant="body2" color="text.secondary">{type.shortDescription}</Typography>
                    )}
                    {type.description && (
                        <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-line" }}>{type.description}</Typography>
                    )}
                </Box>
            </Stack>
        </Paper>
    );
}

/**
 * Step 1 of Product Onboarding. New product → selectable cards of active types
 * (whole card selects; a global Next confirms). Existing product → the chosen
 * type shown as a completed, read-only card (immutable after creation).
 */
export default function ProductTypeStep({
    isNew,
    selectedId,
    onSelect,
    currentType,
}: {
    isNew: boolean;
    selectedId: string | null;
    onSelect: (id: string) => void;
    /** For an existing product: the persisted (possibly now-inactive) type. */
    currentType?: { name: string; shortDescription?: string; description?: string; iconUrl?: string; isActive?: boolean } | null;
}) {
    const q = useActiveProductTypes();

    if (!isNew) {
        return (
            <Stack spacing={2} sx={{ maxWidth: 640 }}>
                <Typography variant="body2" color="text.secondary">
                    The product type cannot be changed after the product is created.
                </Typography>
                {currentType ? (
                    <>
                        <TypeCard type={currentType} selected locked inactive={currentType.isActive === false} />
                        <Alert severity="success" variant="outlined">This step is complete.</Alert>
                    </>
                ) : (
                    <Alert severity="warning">This product has no valid product type.</Alert>
                )}
            </Stack>
        );
    }

    return (
        <Stack spacing={2} sx={{ maxWidth: 640 }}>
            <Typography variant="body2" color="text.secondary">
                Choose the option that best describes the product you want to offer. You won't be able
                to change the product type after the product is created.
            </Typography>

            {q.isLoading && <Typography color="text.secondary">Loading…</Typography>}
            {q.isError && (
                <QueryError message={(q.error as Error)?.message ?? "Could not load product types."} onRetry={() => q.refetch()} />
            )}
            {!q.isLoading && !q.isError && (q.data ?? []).length === 0 && (
                <EmptyState
                    title="No product types available"
                    description="An administrator needs to activate at least one product type."
                />
            )}

            {sortTypes(q.data ?? []).map((t) => (
                <TypeCard key={t.id} type={t} selected={selectedId === t.id} onSelect={() => onSelect(t.id)} />
            ))}
        </Stack>
    );
}
