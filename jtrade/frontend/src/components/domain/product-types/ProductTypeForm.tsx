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

import type { ProductType } from "@/types/productTypes";

export type ProductTypeFormValues = {
    key: string;
    name: string;
    description: string;
    isActive: boolean;
};

type Props = {
    initial?: ProductType | null;
    loading?: boolean;
    onSubmit: (values: ProductTypeFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES: ProductTypeFormValues = {
    key: "",
    name: "",
    description: "",
    isActive: true,
};

export default function ProductTypeForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;

    const [values, setValues] = React.useState(DEFAULT_VALUES);

    React.useEffect(() => {
        setValues({
            key: initial?.key ?? "",
            name: initial?.name ?? "",
            description: initial?.description ?? "",
            isActive: initial?.isActive ?? true,
        });
    }, [initial]);

    const handleChange =
        (field: keyof ProductTypeFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const v = field === "isActive" ? e.target.checked : e.target.value;
                setValues((prev) => ({ ...prev, [field]: v }));
            };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.name.trim() || !values.key.trim()) return;

        await onSubmit({
            key: values.key.trim().toLowerCase(),
            name: values.name.trim(),
            description: values.description.trim(),
            isActive: values.isActive,
        });
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit product type" : "Create new product type"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isEditing ? "Review the category details and update its configuration." : "Add a category providers can classify their products under."}
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Key" value={values.key} onChange={handleChange("key")} fullWidth required
                            InputLabelProps={{ shrink: true }} helperText="e.g. bots, signals" />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Name" value={values.name} onChange={handleChange("name")} fullWidth required InputLabelProps={{ shrink: true }} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField label="Description" value={values.description} onChange={handleChange("description")} fullWidth multiline minRows={2}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={<Switch checked={values.isActive} onChange={handleChange("isActive")} disabled={loading} />}
                            label="Active"
                        />
                    </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" justifyContent={{ xs: "stretch", sm: "flex-end" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading} sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 100, sm: 120 } }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading || !values.name.trim() || !values.key.trim()}
                        sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 120, sm: 140 } }}>
                        {isEditing ? "Save changes" : "Create product type"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
