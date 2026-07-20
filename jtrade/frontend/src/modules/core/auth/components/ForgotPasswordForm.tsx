// src/modules/auth/components/ForgotPasswordForm.tsx
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import toast from "react-hot-toast";
import { forgotPasswordApi } from "@/modules/core/auth/api/auth";

import {
    Box,
    Button,
    Chip,
    Link,
    Stack,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function ForgotPasswordForm() {
    const theme = useTheme();

    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmed = email.trim();
        const isEmail = /\S+@\S+\.\S+/.test(trimmed);
        if (!isEmail) {
            toast.error("Please enter a valid email address.");
            return;
        }

        try {
            setSending(true);
            await forgotPasswordApi({ email: trimmed });
            toast.success("If this email is registered, we’ve sent you a reset link.");
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            toast.error("Could not send reset link. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const disabled = sending || !/\S+@\S+\.\S+/.test(email.trim());

    const badgeBg =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.warning.main, 0.22)
            : alpha(theme.palette.warning.main, 0.16);

    return (
        <Box
            component="form"
            onSubmit={onSubmit}
            autoComplete="on"
            sx={{
                width: "100%",
                maxWidth: 520,
                borderRadius: 4,
                p: { xs: 3, sm: 4 },
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                boxShadow: theme.palette.mode === "dark" ? 10 : 6,
            }}
        >
            <Stack spacing={2.25}>
                {/* Badge */}
                <Chip
                    label="Secure • Fast"
                    size="small"
                    sx={{
                        alignSelf: "flex-start",
                        fontWeight: 800,
                        letterSpacing: 0.6,
                        bgcolor: badgeBg,
                        color: "warning.main",
                        borderRadius: 999,
                        px: 0.75,
                    }}
                />

                {/* Title + copy */}
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                        Forgot password?
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{ mt: 1, color: "text.secondary", maxWidth: 520 }}
                    >
                        Enter the email you use to sign in. We’ll send you a link to reset your
                        password.
                    </Typography>
                </Box>

                {/* Email */}
                <Box>
                    <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 800, mb: 0.75 }}
                    >
                        Email
                    </Typography>

                    <TextField
                        fullWidth
                        type="email"
                        name="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        disabled={sending}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 3,
                            },
                        }}
                    />
                </Box>

                {/* Submit */}
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={disabled}
                    sx={{
                        width: "100%",
                        height: 48,
                        borderRadius: 999,
                        fontWeight: 900,
                        textTransform: "none",
                    }}
                >
                    {sending ? "Sending link…" : "Send reset link"}
                </Button>

                {/* Back link */}
                <Box>
                    <Link
                        component={RouterLink}
                        to="/signin"
                        underline="hover"
                        sx={{
                            fontWeight: 700,
                            color: "text.secondary",
                            "&:hover": { color: "primary.main" },
                        }}
                    >
                        Back to sign in
                    </Link>
                </Box>
            </Stack>
        </Box>
    );
}