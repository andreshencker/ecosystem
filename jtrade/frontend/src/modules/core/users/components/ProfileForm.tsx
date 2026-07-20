// src/modules/users/components/ProfileForm.tsx
import * as React from "react";
import {
    alpha,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Stack,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import ChangePasswordForm from "@/modules/core/auth/components/ChangePasswordForm";
import type { UpdateProfileDto, User } from "../types/users";

type Props = {
    me: User | null;
    loading?: boolean;
    onSubmit: (dto: UpdateProfileDto) => void | Promise<void>;
};

type LocalState = {
    firstName: string;
    middleName: string;
    lastName: string;
    secondLastName: string;
    email: string;
    phone: string;
    avatarUrl: string;

    // solo UI
    avatarFile: File | null;
    avatarPreview: string | null;
};

export default function ProfileForm({ me, loading, onSubmit }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const YELLOW = "#ffd400";

    const [openPwd, setOpenPwd] = React.useState(false);

    const [values, setValues] = React.useState<LocalState>({
        firstName: "",
        middleName: "",
        lastName: "",
        secondLastName: "",
        email: "",
        phone: "",
        avatarUrl: "",
        avatarFile: null,
        avatarPreview: null,
    });

    // hydrate
    React.useEffect(() => {
        if (!me) return;

        setValues((p) => ({
            ...p,
            firstName: me.firstName ?? "",
            middleName: me.middleName ?? "",
            lastName: me.lastName ?? "",
            secondLastName: me.secondLastName ?? "",
            email: me.email ?? "",
            phone: (me as any).phone ?? "",
            avatarUrl: me.avatarUrl ?? "",
            avatarFile: null,
            avatarPreview: null,
        }));
    }, [me]);

    // cleanup preview url
    React.useEffect(() => {
        return () => {
            if (values.avatarPreview) URL.revokeObjectURL(values.avatarPreview);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange =
        (field: keyof Omit<LocalState, "avatarFile" | "avatarPreview">) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value;

                if (field === "avatarUrl") {
                    if (values.avatarPreview) URL.revokeObjectURL(values.avatarPreview);
                    setValues((p) => ({
                        ...p,
                        avatarUrl: v,
                        avatarFile: null,
                        avatarPreview: null,
                    }));
                    return;
                }

                setValues((p) => ({ ...p, [field]: v }));
            };

    const handlePickFile = (file: File | null) => {
        if (values.avatarPreview) URL.revokeObjectURL(values.avatarPreview);

        if (!file) {
            setValues((p) => ({ ...p, avatarFile: null, avatarPreview: null }));
            return;
        }

        const preview = URL.createObjectURL(file);
        setValues((p) => ({
            ...p,
            avatarFile: file,
            avatarPreview: preview,
            avatarUrl: "",
        }));
    };

    const avatarSrc =
        values.avatarPreview ||
        (values.avatarUrl?.trim() ? values.avatarUrl.trim() : me?.avatarUrl) ||
        "";

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!me) return;

        const payload: UpdateProfileDto = {
            firstName: values.firstName?.trim() || undefined,
            middleName: values.middleName?.trim() || undefined,
            lastName: values.lastName?.trim() || undefined,
            secondLastName: values.secondLastName?.trim() || undefined,
            email: values.email?.trim().toLowerCase() || undefined,
            phone: values.phone?.trim() || undefined,
            avatarUrl: values.avatarUrl?.trim() || undefined,
        };

        await onSubmit(payload);
    };

    return (
        <>
            <Card
                variant="outlined"
                sx={{
                    maxWidth: 980,
                    mx: "auto",
                    borderRadius: "20px",
                    borderColor: isDark ? "#24243a" : theme.palette.divider,
                    background: isDark
                        ? `radial-gradient(1200px 500px at 80% -20%, ${alpha(
                            YELLOW,
                            0.09
                        )} 0, transparent 70%), rgba(17,17,25,.66)`
                        : `radial-gradient(1200px 500px at 80% -20%, ${alpha(
                            YELLOW,
                            0.08
                        )} 0, transparent 75%), #ffffff`,
                    boxShadow: isDark
                        ? `0 30px 80px #00000055 inset, 0 10px 40px #00000055`
                        : `0 12px 36px rgba(17,17,17,.06)`,
                    p: { xs: 2, sm: 3 },
                }}
            >
                <CardContent sx={{ p: 0 }}>
                    <Typography variant="h5" fontWeight={800} gutterBottom>
                        Profile details
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                        Update your personal information.
                    </Typography>

                    <Box component="form" onSubmit={submit}>
                        <Stack spacing={2}>
                            {/* Header avatar */}
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar
                                    src={avatarSrc}
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        bgcolor: isDark
                                            ? "rgba(255,255,255,0.06)"
                                            : "rgba(0,0,0,0.06)",
                                    }}
                                />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                                        {values.firstName || values.lastName
                                            ? `${values.firstName} ${values.lastName}`.trim()
                                            : "Your avatar"}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Use an URL or upload a file.
                                    </Typography>
                                </Box>
                            </Stack>

                            <Divider />

                            {/* ✅ Inputs en 2 columnas (desktop) / 1 columna (mobile) */}
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="First name"
                                        value={values.firstName}
                                        onChange={handleChange("firstName")}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Middle name"
                                        value={values.middleName}
                                        onChange={handleChange("middleName")}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Last name"
                                        value={values.lastName}
                                        onChange={handleChange("lastName")}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Second last name"
                                        value={values.secondLastName}
                                        onChange={handleChange("secondLastName")}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Email"
                                        value={values.email}
                                        onChange={handleChange("email")}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Phone"
                                        value={values.phone}
                                        onChange={handleChange("phone")}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                {/* Avatar URL */}
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Avatar URL"
                                        value={values.avatarUrl}
                                        onChange={handleChange("avatarUrl")}
                                        fullWidth
                                        placeholder="https://..."
                                        InputLabelProps={{ shrink: true }}
                                        helperText={
                                            values.avatarFile
                                                ? "URL disabled because a file is selected."
                                                : "Paste an image URL (optional)."
                                        }
                                        disabled={!!values.avatarFile}
                                    />
                                </Grid>

                                {/* Upload + file name */}
                                <Grid item xs={12} md={6}>
                                    <Stack spacing={1}>
                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1}
                                            alignItems={{ xs: "stretch", sm: "center" }}
                                        >
                                            <Button
                                                component="label"
                                                variant="outlined"
                                                color="inherit"
                                                sx={{
                                                    textTransform: "none",
                                                    fontWeight: 700,
                                                    width: { xs: "100%", sm: "auto" },
                                                }}
                                            >
                                                Upload image
                                                <input
                                                    hidden
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) =>
                                                        handlePickFile(e.target.files?.[0] ?? null)
                                                    }
                                                />
                                            </Button>

                                            {values.avatarFile && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    noWrap
                                                    sx={{ flex: 1 }}
                                                >
                                                    Selected: {values.avatarFile.name}
                                                </Typography>
                                            )}

                                            {(values.avatarFile || values.avatarPreview) && (
                                                <Button
                                                    variant="text"
                                                    color="inherit"
                                                    onClick={() => handlePickFile(null)}
                                                    sx={{
                                                        textTransform: "none",
                                                        fontWeight: 700,
                                                        width: { xs: "100%", sm: "auto" },
                                                    }}
                                                >
                                                    Remove file
                                                </Button>
                                            )}
                                        </Stack>

                                        {values.avatarFile && (
                                            <Typography variant="caption" color="text.secondary">
                                                Note: file upload is preview-only until we connect an
                                                upload endpoint.
                                            </Typography>
                                        )}
                                    </Stack>
                                </Grid>
                            </Grid>

                            <Divider />

                            {/* Actions */}
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading || !me}
                                    sx={{
                                        height: 48,
                                        borderRadius: "14px",
                                        fontWeight: 800,
                                        textTransform: "none",
                                        backgroundColor: YELLOW,
                                        color: "#111214",
                                        border: `1px solid ${YELLOW}`,
                                        boxShadow: `0 6px 20px ${alpha(YELLOW, 0.18)}`,
                                        "&:hover": {
                                            backgroundColor: YELLOW,
                                            filter: "brightness(0.98)",
                                            boxShadow: `0 10px 26px ${alpha(YELLOW, 0.24)}`,
                                        },
                                    }}
                                    fullWidth
                                >
                                    {loading ? "Saving…" : "Save profile"}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={() => setOpenPwd(true)}
                                    sx={{
                                        height: 48,
                                        borderRadius: "14px",
                                        fontWeight: 800,
                                        textTransform: "none",
                                        borderColor: "divider",
                                    }}
                                    fullWidth
                                >
                                    Change password
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            {/* Modal Change Password */}
            <Dialog
                open={openPwd}
                onClose={() => setOpenPwd(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        pr: 1,
                    }}
                >
                    <Typography fontWeight={900}>Change password</Typography>
                    <IconButton onClick={() => setOpenPwd(false)} size="small">
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 1 }}>
                    <ChangePasswordForm />
                </DialogContent>
            </Dialog>
        </>
    );
}