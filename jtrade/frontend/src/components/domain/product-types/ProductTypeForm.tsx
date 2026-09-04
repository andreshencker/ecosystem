import * as React from "react";
import {
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";

import type { ProductType } from "@/types/productTypes";
import { useUploadProductTypeIcon } from "@/hooks/api/useProductTypes";

export type ProductTypeFormValues = {
    key: string;
    name: string;
    shortDescription: string;
    description: string;
    iconUrl: string;
    isActive: boolean;
    displayOrder: number;
};

type Props = {
    initial?: ProductType | null;
    loading?: boolean;
    onSubmit: (values: Omit<ProductTypeFormValues, "key"> & { key?: string }) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULTS: ProductTypeFormValues = {
    key: "", name: "", shortDescription: "", description: "", iconUrl: "", isActive: true, displayOrder: 0,
};

export default function ProductTypeForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;
    const uploadIcon = useUploadProductTypeIcon();

    const [values, setValues] = React.useState(DEFAULTS);
    const [broken, setBroken] = React.useState(false);

    React.useEffect(() => {
        setValues({
            key: initial?.key ?? "",
            name: initial?.name ?? "",
            shortDescription: initial?.shortDescription ?? "",
            description: initial?.description ?? "",
            iconUrl: initial?.iconUrl ?? "",
            isActive: initial?.isActive ?? true,
            displayOrder: initial?.displayOrder ?? 0,
        });
        setBroken(false);
    }, [initial]);

    const set = <K extends keyof ProductTypeFormValues>(k: K, v: ProductTypeFormValues[K]) =>
        setValues((s) => ({ ...s, [k]: v }));

    const valid = values.name.trim().length >= 2 && (isEditing || values.key.trim().length >= 2);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid) return;
        await onSubmit({
            ...(isEditing ? {} : { key: values.key.trim().toLowerCase() }),
            name: values.name.trim(),
            shortDescription: values.shortDescription.trim(),
            description: values.description.trim(),
            iconUrl: values.iconUrl.trim(),
            isActive: values.isActive,
            displayOrder: Number(values.displayOrder) || 0,
        });
    };

    const onIconFile = async (file: File) => {
        if (!initial) return;
        const updated = await uploadIcon.mutateAsync({ id: initial.id, file });
        set("iconUrl", updated.iconUrl);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit product type" : "Create product type"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        The official catalogue of product kinds. Providers only select from active types.
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Key" value={values.key} onChange={(e) => set("key", e.target.value)}
                            fullWidth required={!isEditing} disabled={isEditing}
                            InputLabelProps={{ shrink: true }}
                            helperText={isEditing ? "The key is immutable." : "Machine id, e.g. bot, signal. Lowercase."}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Name" value={values.name} onChange={(e) => set("name", e.target.value)}
                            fullWidth required InputLabelProps={{ shrink: true }} placeholder="Signal" />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Short description" value={values.shortDescription}
                            onChange={(e) => set("shortDescription", e.target.value)}
                            fullWidth InputLabelProps={{ shrink: true }}
                            placeholder="Signal-based trading product"
                            helperText="One line shown on the provider's selection card."
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Description" value={values.description}
                            onChange={(e) => set("description", e.target.value)}
                            fullWidth multiline minRows={3} InputLabelProps={{ shrink: true }}
                            helperText="Explains to the provider what this kind of product is."
                        />
                    </Grid>

                    {/* icon */}
                    <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">Icon</Typography>
                        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mt: 0.5 }}>
                            <Box
                                sx={{
                                    width: 64, height: 64, flexShrink: 0, borderRadius: 1.5, border: 1, borderColor: "divider",
                                    bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                                }}
                            >
                                {values.iconUrl && !broken ? (
                                    <Box component="img" src={values.iconUrl} alt="" onError={() => setBroken(true)}
                                        sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                ) : (
                                    <ImageOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                                )}
                            </Box>
                            <Stack spacing={1} sx={{ flex: 1 }}>
                                <Stack direction="row" spacing={1}>
                                    <Button component="label" size="small" variant="outlined" startIcon={<UploadFileOutlinedIcon />}
                                        disabled={!isEditing || uploadIcon.isPending}>
                                        {uploadIcon.isPending ? "Uploading…" : "Upload"}
                                        <input hidden type="file" accept="image/*"
                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onIconFile(f); e.currentTarget.value = ""; }} />
                                    </Button>
                                    {values.iconUrl && (
                                        <Button size="small" color="inherit" onClick={() => { set("iconUrl", ""); setBroken(false); }}>
                                            Remove
                                        </Button>
                                    )}
                                </Stack>
                                <TextField size="small" label="…or icon URL" value={values.iconUrl}
                                    onChange={(e) => { set("iconUrl", e.target.value); setBroken(false); }}
                                    InputLabelProps={{ shrink: true }} fullWidth />
                                {!isEditing && (
                                    <Typography variant="caption" color="text.disabled">
                                        Upload is available after the type is created — paste a URL for now.
                                    </Typography>
                                )}
                            </Stack>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Display order" type="number" value={values.displayOrder}
                            onChange={(e) => set("displayOrder", Number(e.target.value))}
                            fullWidth InputLabelProps={{ shrink: true }} inputProps={{ min: 0 }}
                            helperText="Lower appears first in the selection screen." />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "center" }}>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={<Switch checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} disabled={loading} />}
                            label="Active (providers can create new products of this type)"
                        />
                    </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading || !valid}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        {isEditing ? "Save changes" : "Create type"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
