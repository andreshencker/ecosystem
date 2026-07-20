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

import type { CreateUserAdminDto, User, UserRole } from "../types/user";

export type UserFormValues = Omit<CreateUserAdminDto, "avatarUrl">;

type Props = {
    initial?: User | null;
    loading?: boolean;
    onSubmit: (values: UserFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES: UserFormValues = {
    firstName: "",
    middleName: "",
    lastName: "",
    secondLastName: "",
    email: "",
    role: "CLIENT",
    isActive: true,
};

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
    { label: "ADMIN", value: "ADMIN" },
    { label: "CLIENT", value: "CLIENT" },
    { label: "PROVIDER", value: "PROVIDER" },
];

function normalizeRole(role?: string | null): UserRole {
    const normalized = String(role ?? "CLIENT").trim().toUpperCase();

    if (normalized === "ADMIN") return "ADMIN";
    return "CLIENT";
}

export default function UserForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;

    const [values, setValues] = React.useState<UserFormValues>(() => {
        if (!initial) return DEFAULT_VALUES;

        return {
            firstName: initial.firstName ?? "",
            middleName: initial.middleName ?? "",
            lastName: initial.lastName ?? "",
            secondLastName: initial.secondLastName ?? "",
            email: initial.email ?? "",
            role: normalizeRole(initial.role),
            isActive: initial.isActive ?? true,
        };
    });

    React.useEffect(() => {
        if (!initial) {
            setValues(DEFAULT_VALUES);
            return;
        }

        setValues({
            firstName: initial.firstName ?? "",
            middleName: initial.middleName ?? "",
            lastName: initial.lastName ?? "",
            secondLastName: initial.secondLastName ?? "",
            email: initial.email ?? "",
            role: normalizeRole(initial.role),
            isActive: initial.isActive ?? true,
        });
    }, [initial]);

    const handleChange =
        (field: keyof UserFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const nextValue =
                    field === "isActive"
                        ? (e.target as HTMLInputElement).checked
                        : e.target.value;

                setValues((prev) => ({ ...prev, [field]: nextValue as never }));
            };

    const resetToDefault = () => setValues(DEFAULT_VALUES);

    const handleCancel = () => {
        resetToDefault();
        onCancel?.();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const firstName = values.firstName.trim();
        const lastName = values.lastName.trim();
        const email = values.email.trim().toLowerCase();

        if (!firstName || !lastName || !email) return;

        const role = String(values.role ?? "CLIENT").toLowerCase() as any;

        await onSubmit({
            firstName,
            middleName: values.middleName?.trim() || undefined,
            lastName,
            secondLastName: values.secondLastName?.trim() || undefined,
            email,
            role,
            isActive: !!values.isActive,
        });

        if (!isEditing) resetToDefault();
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                maxWidth: 680,
                mx: "auto",
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 1.5, sm: 2, md: 2.5 },
                bgcolor: "background.paper",
                overflow: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit user" : "Create new user"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        {isEditing
                            ? "Review user details and update access information."
                            : "Create a new user and define their access level."}
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="First name"
                            value={values.firstName}
                            onChange={handleChange("firstName")}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Middle name"
                            value={values.middleName ?? ""}
                            onChange={handleChange("middleName")}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Last name"
                            value={values.lastName}
                            onChange={handleChange("lastName")}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Second last name"
                            value={values.secondLastName ?? ""}
                            onChange={handleChange("secondLastName")}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Email"
                            value={values.email}
                            onChange={handleChange("email")}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ autoCapitalize: "none", autoCorrect: "off" }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Role"
                            value={values.role}
                            onChange={handleChange("role")}
                            fullWidth
                            required
                            disabled={isEditing || loading}
                            InputLabelProps={{ shrink: true }}
                            helperText={
                                isEditing
                                    ? "Role cannot be changed while editing."
                                    : "Select the access level for the user."
                            }
                        >
                            {ROLE_OPTIONS.map((r) => (
                                <MenuItem key={r.value} value={r.value}>
                                    {r.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                            sx={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                minHeight: 56,
                                px: 0.5,
                            }}
                        >
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={!!values.isActive}
                                        onChange={handleChange("isActive")}
                                        disabled={loading}
                                    />
                                }
                                label="Active"
                            />
                        </Box>
                    </Grid>
                </Grid>

                <Divider />

                <Stack
                    direction="row"
                    justifyContent={{ xs: "stretch", sm: "flex-end" }}
                    spacing={1.5}
                    flexWrap="wrap"
                    useFlexGap
                >
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleCancel}
                        disabled={loading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: { xs: 100, sm: 120 },
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={
                            !!loading ||
                            !values.firstName.trim() ||
                            !values.lastName.trim() ||
                            !values.email.trim()
                        }
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: { xs: 120, sm: 140 },
                        }}
                    >
                        {isEditing ? "Save changes" : "Create user"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}