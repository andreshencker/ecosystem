// src/modules/auth/components/ChangePasswordForm.tsx
import * as React from "react";
import {
    alpha,
    Button,
    Card,
    CardContent,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import {Visibility, VisibilityOff} from "@mui/icons-material";
import {useMutation} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {changePassword} from "@/modules/core/auth/api/auth";

export default function ChangePasswordForm() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const YELLOW = "#ffd400";
    const inputBg = isDark ? "#141422" : "#ffffff";
    const inputBr = isDark ? "#23233a" : "#e5e7eb";
    const inputText = isDark ? "#ffffff" : "#111214";
    const placeholder = isDark ? "#ffffff66" : alpha("#111214", 0.5);

    // ---- Input styles con efecto amarillo ----
    const inputSx = {
        "& .MuiOutlinedInput-root": {
            backgroundColor: inputBg,
            borderRadius: "12px",
            color: inputText,
            "& fieldset": {borderColor: inputBr},
            "&:hover fieldset": {borderColor: inputBr},
            "&.Mui-focused fieldset": {
                borderColor: alpha(YELLOW, 0.6),
                boxShadow: `0 0 0 4px ${alpha(YELLOW, 0.15)}`,
            },
            "& .MuiOutlinedInput-input": {height: 24, padding: "12px 14px"},
        },
        "& .MuiInputBase-input::placeholder": {color: placeholder},
    } as const;

    // ---- State ----
    const [current, setCurrent] = React.useState("");
    const [next, setNext] = React.useState("");
    const [confirm, setConfirm] = React.useState("");
    const [show, setShow] = React.useState<{ [k: string]: boolean }>({
        current: false,
        next: false,
        confirm: false,
    });

    const toggleShow = (field: string) =>
        setShow((s) => ({...s, [field]: !s[field]}));

    // ---- Mutation ----
    const mChange = useMutation({
        mutationFn: async () => {
            if (!current || !next || !confirm)
                throw new Error("All fields are required");
            if (next.length < 8)
                throw new Error("New password must be at least 8 characters");
            if (next !== confirm) throw new Error("Passwords do not match");

            const res = await changePassword({current, next});
            return res;
        },
        onSuccess: () => {
            toast.success("Password updated successfully");
            setCurrent("");
            setNext("");
            setConfirm("");
        },
        onError: (e: any) => {
            const msg =
                e?.response?.data?.message || e?.message || "Could not update password";
            toast.error(msg);
        },
    });

    // ---- UI ----
    return (
        <Card
            variant="outlined"
            sx={{
                maxWidth: 420,
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
                p: {xs: 2, sm: 3},
            }}
        >
            <CardContent sx={{p: 0}}>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                    Change Password
                </Typography>
                <Typography variant="body1" sx={{color: "text.secondary", mb: 2.5}}>
                    Update your account password below.
                </Typography>

                <Stack spacing={1.5}>
                    <TextField
                        variant="outlined"
                        type={show.current ? "text" : "password"}
                        placeholder="Current password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        fullWidth
                        sx={inputSx}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => toggleShow("current")} edge="end">
                                        {show.current ? <VisibilityOff/> : <Visibility/>}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        variant="outlined"
                        type={show.next ? "text" : "password"}
                        placeholder="New password"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        fullWidth
                        sx={inputSx}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => toggleShow("next")} edge="end">
                                        {show.next ? <VisibilityOff/> : <Visibility/>}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        variant="outlined"
                        type={show.confirm ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        fullWidth
                        sx={inputSx}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => toggleShow("confirm")} edge="end">
                                        {show.confirm ? <VisibilityOff/> : <Visibility/>}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Button
                        variant="contained"
                        fullWidth
                        disabled={mChange.isPending}
                        onClick={() => mChange.mutate()}
                        sx={{
                            mt: 0.5,
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
                            "&:active": {transform: "translateY(1px)"},
                        }}
                    >
                        {mChange.isPending ? "Updating…" : "Update password"}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
}