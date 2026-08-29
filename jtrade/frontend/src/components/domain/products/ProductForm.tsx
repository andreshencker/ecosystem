import * as React from "react";
import {
    Box,
    Button,
    Divider,
    Grid,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import type { Product } from "@/types/products";
import { refId } from "@/types/products";
import { useProductTypes } from "@/hooks/api/useProductTypes";
import { usePlatforms } from "@/hooks/api/usePlatforms";

export type ProductFormValues = {
    typeProductId: string;
    key: string;
    name: string;
    description: string;
    platformId: string;
};

type Props = {
    initial?: Product | null;
    loading?: boolean;
    onSubmit: (values: ProductFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES: ProductFormValues = {
    typeProductId: "",
    key: "",
    name: "",
    description: "",
    platformId: "",
};

export default function ProductForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;
    const typesQuery = useProductTypes();
    const platformsQuery = usePlatforms({ active: true });
    const types = typesQuery.data ?? [];
    const platforms = (platformsQuery.data ?? []).filter((p) => p.isSupported);

    const [values, setValues] = React.useState(DEFAULT_VALUES);

    React.useEffect(() => {
        setValues({
            typeProductId: refId(initial?.typeProductId),
            key: initial?.key ?? "",
            name: initial?.name ?? "",
            description: initial?.description ?? "",
            platformId: refId(initial?.platforms?.[0]?.platformId),
        });
    }, [initial]);

    const handleChange =
        (field: keyof ProductFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                setValues((prev) => ({ ...prev, [field]: e.target.value }));
            };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.name.trim() || !values.key.trim() || !values.typeProductId || !values.platformId) return;
        await onSubmit(values);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit product" : "New product"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isEditing ? "Update the product and its target platform." : "Define the product and its trading platform."}
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Key" value={values.key} onChange={handleChange("key")} fullWidth required
                            InputLabelProps={{ shrink: true }} helperText="Stable identifier, e.g. trend-bot" />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Name" value={values.name} onChange={handleChange("name")} fullWidth required InputLabelProps={{ shrink: true }} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Product type" value={values.typeProductId} onChange={handleChange("typeProductId")} fullWidth required InputLabelProps={{ shrink: true }}>
                            {types.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Initial platform" value={values.platformId} onChange={handleChange("platformId")} fullWidth required InputLabelProps={{ shrink: true }}>
                            {platforms.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField label="Description" value={values.description} onChange={handleChange("description")} fullWidth multiline minRows={3}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" justifyContent={{ xs: "stretch", sm: "flex-end" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading} sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 100, sm: 120 } }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading || !values.name.trim() || !values.key.trim() || !values.typeProductId || !values.platformId}
                        sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 120, sm: 140 } }}>
                        {isEditing ? "Save changes" : "Create draft"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
