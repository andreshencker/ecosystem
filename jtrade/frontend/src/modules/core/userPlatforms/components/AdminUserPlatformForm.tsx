import * as React from "react";
import { Box, Button, Grid, TextField, Typography, FormControlLabel, Switch } from "@mui/material";

export type AdminUserPlatformFormValues = {
    userId: string;
    platformId: string;
    isDefault: boolean;
};

type Props = {
    initialUserId?: string; // para la página por usuario
    loading?: boolean;
    onSubmit: (values: AdminUserPlatformFormValues) => void | Promise<void>;
};

const DEFAULT_VALUES: AdminUserPlatformFormValues = {
    userId: "",
    platformId: "",
    isDefault: false,
};

export default function AdminUserPlatformForm({ initialUserId, loading, onSubmit }: Props) {
    const [values, setValues] = React.useState<AdminUserPlatformFormValues>({
        ...DEFAULT_VALUES,
        userId: initialUserId ?? "",
    });

    React.useEffect(() => {
        if (initialUserId) {
            setValues((p) => ({ ...p, userId: initialUserId }));
        }
    }, [initialUserId]);

    const handle = (k: keyof AdminUserPlatformFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = k === "isDefault" ? (e.target as HTMLInputElement).checked : e.target.value;
        setValues((p) => ({ ...p, [k]: v as any }));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        const userId = values.userId.trim();
        const platformId = values.platformId.trim();
        if (!userId || !platformId) return;

        await onSubmit({ userId, platformId, isDefault: !!values.isDefault });

        // reset platformId e isDefault, pero conservamos userId
        setValues((p) => ({ ...p, platformId: "", isDefault: false }));
    };

    return (
        <Box
            component="form"
            onSubmit={submit}
            sx={{
                mb: 3,
                p: 2,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                Add platform to user
            </Typography>

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <TextField
                        label="User ID"
                        value={values.userId}
                        onChange={handle("userId")}
                        size="small"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        disabled={!!initialUserId} // en la vista por user lo bloqueamos
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <TextField
                        label="Platform ID"
                        value={values.platformId}
                        onChange={handle("platformId")}
                        size="small"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>

                <Grid item xs={12} md={2} sx={{ display: "flex", alignItems: "center" }}>
                    <FormControlLabel
                        control={<Switch size="small" checked={values.isDefault} onChange={handle("isDefault")} />}
                        label="Default"
                    />
                </Grid>

                <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || !values.userId.trim() || !values.platformId.trim()}
                    >
                        Add
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}