import * as React from "react";
import {
    Box, Button, Divider, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead,
    TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import type { CreateProductPayload, Product } from "@/types/products";
import { refId } from "@/types/products";
import { useProductTypes } from "@/hooks/api/useProductTypes";
import { usePlatforms } from "@/hooks/api/usePlatforms";
import { useIndicators } from "@/hooks/api/useIndicators";

export type ProductFormValues = CreateProductPayload;

type Props = {
    initial?: Product | null;
    loading?: boolean;
    onSubmit: (values: ProductFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const slugify = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function ProductForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;
    const typesQuery = useProductTypes();
    const platformsQuery = usePlatforms({ active: true });
    const indicatorsQuery = useIndicators();

    const types = typesQuery.data ?? [];
    const platforms = (platformsQuery.data ?? []).filter((p) => p.isSupported);
    const indicators = React.useMemo(
        () => (indicatorsQuery.data ?? []).filter((i) => i.isActive).sort((a, b) => a.name.localeCompare(b.name)),
        [indicatorsQuery.data],
    );

    const [typeProductId, setTypeProductId] = React.useState("");
    const [platformId, setPlatformId] = React.useState("");
    const [key, setKey] = React.useState("");
    const [keyTouched, setKeyTouched] = React.useState(false);
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [indicatorIds, setIndicatorIds] = React.useState<string[]>([]);
    const [draftIndicator, setDraftIndicator] = React.useState("");

    React.useEffect(() => {
        setTypeProductId(refId(initial?.typeProductId));
        setPlatformId(refId(initial?.platformId));
        setKey(initial?.key ?? "");
        setKeyTouched(!!initial);
        setName(initial?.name ?? "");
        setDescription(initial?.description ?? "");
        setIndicatorIds((initial?.indicatorIds ?? []).map((i) => refId(i)));
    }, [initial]);

    const selectedType = types.find((t) => t.id === typeProductId);
    const isSignals = selectedType?.key === "signals";
    const effectiveKey = keyTouched ? key : slugify(name);
    const canSubmit = !!typeProductId && !!platformId && name.trim().length >= 2 && slugify(effectiveKey).length >= 2 && !loading;

    const indicatorById = React.useCallback((id: string) => indicators.find((i) => i.id === id), [indicators]);
    const availableIndicators = indicators.filter((i) => !indicatorIds.includes(i.id!));

    const addIndicator = () => {
        if (!draftIndicator || indicatorIds.includes(draftIndicator)) return;
        setIndicatorIds((cur) => [...cur, draftIndicator]);
        setDraftIndicator("");
    };
    const removeIndicator = (id: string) => setIndicatorIds((cur) => cur.filter((x) => x !== id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        await onSubmit({
            typeProductId,
            platformId,
            key: slugify(effectiveKey),
            name: name.trim(),
            description: description.trim(),
            indicatorIds: isSignals ? indicatorIds : [],
        });
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit product" : "New product"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isEditing
                            ? "Type and platform can't be changed after creation."
                            : "One product = one type on one platform."}
                    </Typography>
                </Box>

                <Divider />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                        select label="Product type" value={typeProductId}
                        onChange={(e) => setTypeProductId(e.target.value)}
                        fullWidth required disabled={isEditing} InputLabelProps={{ shrink: true }}
                    >
                        {types.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </TextField>
                    <TextField
                        select label="Platform" value={platformId}
                        onChange={(e) => setPlatformId(e.target.value)}
                        fullWidth required disabled={isEditing} InputLabelProps={{ shrink: true }}
                        helperText={platforms.length ? undefined : "No supported platforms available"}
                    >
                        {platforms.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </TextField>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)}
                        fullWidth required InputLabelProps={{ shrink: true }} />
                    <TextField label="Key" value={effectiveKey}
                        onChange={(e) => { setKeyTouched(true); setKey(e.target.value); }}
                        fullWidth required disabled={isEditing} InputLabelProps={{ shrink: true }}
                        helperText="Stable identifier, e.g. trend-bot" />
                </Stack>

                <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)}
                    fullWidth multiline minRows={3} InputLabelProps={{ shrink: true }} />

                {isSignals && (
                    <>
                        <Divider />
                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>Indicators</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                The indicators whose signals this product delivers.
                            </Typography>

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }} sx={{ mb: 1.5 }}>
                                <TextField
                                    select size="small" label="Indicator" value={draftIndicator}
                                    onChange={(e) => setDraftIndicator(e.target.value)}
                                    sx={{ flex: 1, minWidth: 200 }} InputLabelProps={{ shrink: true }}
                                    SelectProps={{ displayEmpty: true }}
                                    helperText={indicators.length ? undefined : "No active indicators — create some in Indicators first"}
                                >
                                    <MenuItem value="" disabled>
                                        {availableIndicators.length ? "Select indicator…" : "All indicators added"}
                                    </MenuItem>
                                    {availableIndicators.map((ind) => <MenuItem key={ind.id} value={ind.id}>{ind.name}</MenuItem>)}
                                </TextField>
                                <Button
                                    variant="outlined" startIcon={<AddIcon />} onClick={addIndicator} disabled={!draftIndicator}
                                    sx={{ textTransform: "none", fontWeight: 700 }}
                                >
                                    Add
                                </Button>
                            </Stack>

                            {indicatorIds.length > 0 ? (
                                <Table size="small" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, borderCollapse: "separate", "& td, & th": { borderColor: "divider" } }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Indicator</TableCell>
                                            <TableCell sx={{ width: 48 }} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {indicatorIds.map((id) => (
                                            <TableRow key={id}>
                                                <TableCell>{indicatorById(id)?.name ?? id}</TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Remove">
                                                        <IconButton size="small" onClick={() => removeIndicator(id)} aria-label="Remove indicator">
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Typography variant="caption" color="text.disabled">No indicators added.</Typography>
                            )}
                        </Box>
                    </>
                )}

                <Divider />

                <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={!canSubmit}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        {isEditing ? "Save changes" : "Create draft"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
