// src/modules/integrations/binance/binanceAccount/components/BinanceAccountForm.tsx
import * as React from "react";
import {Box, Button, FormControlLabel, Grid, Switch, TextField, Typography,} from "@mui/material";
import type {BinanceAccount} from "@/modules/integrations/binance/binanceAccount/types/binanceAccounts";

export type BinanceAccountFormValues = {
    description: string;
    apiKey: string;
    secretKey: string;
    isActive: boolean;
};

type Props = {
    initial?: BinanceAccount | null;          // si viene → edit, si no → create
    loading?: boolean;
    onSubmit: (values: BinanceAccountFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES: BinanceAccountFormValues = {
    description: "",
    apiKey: "",
    secretKey: "",
    isActive: true,
};

export default function BinanceAccountForm({
                                               initial,
                                               loading,
                                               onSubmit,
                                               onCancel,
                                           }: Props) {
    const [values, setValues] = React.useState<BinanceAccountFormValues>(() =>
        initial
            ? {
                description: initial.description ?? "",
                apiKey: "",      // por seguridad no mostramos la key
                secretKey: "",
                isActive: initial.isActive ?? true,
            }
            : DEFAULT_VALUES,
    );

    // cuando cambia initial (entras/sales de modo edición) reseteamos el form
    React.useEffect(() => {
        if (!initial) {
            setValues(DEFAULT_VALUES);
            return;
        }

        setValues({
            description: initial.description ?? "",
            apiKey: "",
            secretKey: "",
            isActive: initial.isActive ?? true,
        });
    }, [initial]);

    const handleChange =
        (field: keyof BinanceAccountFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const value =
                    field === "isActive"
                        ? (e.target as HTMLInputElement).checked
                        : e.target.value;

                setValues((prev) => ({
                    ...prev,
                    [field]: value as any,
                }));
            };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.description.trim()) return;

        await onSubmit({
            ...values,
            description: values.description.trim(),
            apiKey: values.apiKey.trim(),
            secretKey: values.secretKey.trim(),
        });
    };

    const handleCancel = () => {
        setValues(DEFAULT_VALUES);
        onCancel?.();
    };

    const isEditing = !!initial;

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                mb: 3,
                p: 2,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
            }}
        >
            <Typography variant="subtitle1" fontWeight={600} sx={{mb: 2}}>
                {isEditing ? "Edit Binance API account" : "Add Binance API account"}
            </Typography>

            <Grid container spacing={2}>
                {/* Description */}
                <Grid item xs={12} md={4}>
                    <TextField
                        label="Description"
                        value={values.description}
                        onChange={handleChange("description")}
                        size="small"
                        fullWidth
                        required
                    />
                </Grid>

                {/* API Key */}
                <Grid item xs={12} md={4}>
                    <TextField
                        label="API key"
                        value={values.apiKey}
                        onChange={handleChange("apiKey")}
                        size="small"
                        fullWidth
                        placeholder={isEditing ? "Leave blank to keep current" : ""}
                    />
                </Grid>

                {/* Secret Key */}
                <Grid item xs={12} md={4}>
                    <TextField
                        label="Secret key"
                        value={values.secretKey}
                        onChange={handleChange("secretKey")}
                        size="small"
                        fullWidth
                        placeholder={isEditing ? "Leave blank to keep current" : ""}
                    />
                </Grid>

                {/* Active switch */}
                <Grid item xs={12} md={4}>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={values.isActive}
                                onChange={handleChange("isActive")}
                            />
                        }
                        label="Active"
                    />
                </Grid>

                {/* Actions */}
                <Grid
                    item
                    xs={12}
                    md={8}
                    sx={{display: "flex", justifyContent: "flex-end", gap: 2}}
                >
                    {isEditing && (
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                    )}

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || !values.description.trim()}
                    >
                        {isEditing ? "Save changes" : "Create account"}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}