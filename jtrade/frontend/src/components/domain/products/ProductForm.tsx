import * as React from "react";
import {
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    MenuItem,
    Stack,
    Switch,
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
    billingType: "one_time" | "subscription";
    billingInterval: "month" | "year";
    priceInput: string;
    discountEnabled: boolean;
    discountType: "percentage" | "fixed";
    discountValueInput: string;
    discountStartsAt: string;
    discountEndsAt: string;
    discountActive: boolean;
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
    billingType: "one_time",
    billingInterval: "month",
    priceInput: "",
    discountEnabled: false,
    discountType: "percentage",
    discountValueInput: "",
    discountStartsAt: "",
    discountEndsAt: "",
    discountActive: true,
};

/** yyyy-mm-dd for a date input, from an ISO string. */
function toDateInputValue(iso: string | null | undefined): string {
    if (!iso) return "";
    return iso.slice(0, 10);
}

export default function ProductForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;
    const typesQuery = useProductTypes();
    const platformsQuery = usePlatforms({ active: true });
    const types = typesQuery.data ?? [];
    const platforms = (platformsQuery.data ?? []).filter((p) => p.isSupported);

    const [values, setValues] = React.useState(DEFAULT_VALUES);

    React.useEffect(() => {
        const platform = initial?.platforms?.[0];
        const discount = platform?.discount;
        setValues({
            typeProductId: refId(initial?.typeProductId),
            key: initial?.key ?? "",
            name: initial?.name ?? "",
            description: initial?.description ?? "",
            platformId: refId(platform?.platformId),
            billingType: platform?.billingType ?? "one_time",
            billingInterval: platform?.billingInterval ?? "month",
            priceInput: platform?.priceAmount ? (platform.priceAmount / 100).toFixed(2) : "",
            discountEnabled: !!discount,
            discountType: discount?.type ?? "percentage",
            discountValueInput: discount ? String(discount.type === "percentage" ? discount.value : discount.value / 100) : "",
            discountStartsAt: toDateInputValue(discount?.startsAt),
            discountEndsAt: toDateInputValue(discount?.endsAt),
            discountActive: discount?.isActive ?? true,
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
        if (values.discountEnabled && !values.discountValueInput.trim()) return;
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
                </Grid>

                <Divider />

                <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                        Pricing
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        You decide how this platform is priced.
                    </Typography>
                </Box>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Billing type" value={values.billingType}
                            onChange={(e) => setValues((prev) => ({ ...prev, billingType: e.target.value as ProductFormValues["billingType"] }))}
                            fullWidth required InputLabelProps={{ shrink: true }}>
                            <MenuItem value="one_time">One-time purchase</MenuItem>
                            <MenuItem value="subscription">Subscription</MenuItem>
                        </TextField>
                    </Grid>

                    {values.billingType === "subscription" && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select label="Billing interval" value={values.billingInterval}
                                onChange={(e) => setValues((prev) => ({ ...prev, billingInterval: e.target.value as ProductFormValues["billingInterval"] }))}
                                fullWidth required InputLabelProps={{ shrink: true }}>
                                <MenuItem value="month">Monthly</MenuItem>
                                <MenuItem value="year">Yearly</MenuItem>
                            </TextField>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Price (USD)" value={values.priceInput} onChange={handleChange("priceInput")}
                            fullWidth required type="number" inputProps={{ min: 0, step: "0.01" }}
                            InputLabelProps={{ shrink: true }}
                            helperText={values.billingType === "subscription" ? `Charged every ${values.billingInterval === "year" ? "year" : "month"}` : "One-time price"}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={<Switch checked={values.discountEnabled} onChange={(e) => setValues((prev) => ({ ...prev, discountEnabled: e.target.checked }))} />}
                            label="Add a discount"
                        />
                    </Grid>

                    {values.discountEnabled && (
                        <>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField select label="Discount type" value={values.discountType}
                                    onChange={(e) => setValues((prev) => ({ ...prev, discountType: e.target.value as ProductFormValues["discountType"] }))}
                                    fullWidth required InputLabelProps={{ shrink: true }}>
                                    <MenuItem value="percentage">Percentage off</MenuItem>
                                    <MenuItem value="fixed">Fixed amount off (USD)</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label={values.discountType === "percentage" ? "Discount %" : "Discount amount (USD)"}
                                    value={values.discountValueInput} onChange={handleChange("discountValueInput")}
                                    fullWidth required type="number"
                                    inputProps={values.discountType === "percentage" ? { min: 0, max: 100, step: 1 } : { min: 0, step: "0.01" }}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField label="Starts at" value={values.discountStartsAt} onChange={handleChange("discountStartsAt")}
                                    fullWidth type="date" InputLabelProps={{ shrink: true }} helperText="Optional — leave blank to start immediately" />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField label="Ends at" value={values.discountEndsAt} onChange={handleChange("discountEndsAt")}
                                    fullWidth type="date" InputLabelProps={{ shrink: true }} helperText="Optional — leave blank for no end date" />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <FormControlLabel
                                    sx={{ m: 0 }}
                                    control={<Switch checked={values.discountActive} onChange={(e) => setValues((prev) => ({ ...prev, discountActive: e.target.checked }))} />}
                                    label="Discount active"
                                />
                            </Grid>
                        </>
                    )}
                </Grid>

                <Divider />

                <TextField label="Description" value={values.description} onChange={handleChange("description")} fullWidth multiline minRows={3}
                    InputLabelProps={{ shrink: true }} />

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
