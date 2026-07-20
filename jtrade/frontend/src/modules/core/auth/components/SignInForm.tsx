import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
    Link,
    useTheme,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import { useAuth } from "@/modules/core/auth/hooks/useAuth";

export default function SignInForm() {
    const theme = useTheme();
    const { login, loading } = useAuth();

    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPass, setShowPass] = React.useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedEmail = email.trim();
        const trimmedPass = password;

        const isEmail = /\S+@\S+\.\S+/.test(trimmedEmail);
        if (!isEmail) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (trimmedPass.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        try {
            await login(trimmedEmail, trimmedPass);
        } catch (err) {
            // useAuth ya muestra el error
            // eslint-disable-next-line no-console
            console.error(err);
        }
    };

    const disabled =
        loading ||
        !email.trim() ||
        password.length < 6 ||
        !/\S+@\S+\.\S+/.test(email.trim());

    return (
        <Paper
            component="form"
            onSubmit={onSubmit}
            elevation={0}
            sx={{
                borderRadius: 4,
                p: { xs: 2.5, sm: 3 },
                border: "1px solid",
                borderColor: "divider",
                bgcolor:
                    theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.04)"
                        : "background.paper",
                backdropFilter: theme.palette.mode === "dark" ? "blur(8px)" : "none",
                maxWidth: 520,
                width: "100%",
                ml: { xs: 0, md: "auto" }, // en desktop se alinea a la derecha
            }}
            autoComplete="on"
        >
            <Stack spacing={2}>
                <Box>
                    <Chip
                        label="Secure • Fast"
                        size="small"
                        sx={{
                            mb: 1.5,
                            fontWeight: 800,
                            letterSpacing: 0.5,
                            bgcolor:
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 193, 7, 0.16)"
                                    : "rgba(255, 193, 7, 0.22)",
                            border: "1px solid",
                            borderColor: "divider",
                        }}
                    />

                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 900, lineHeight: 1.1 }}
                    >
                        Sign in
                    </Typography>

                    <Typography sx={{ color: "text.secondary", mt: 0.75 }}>
                        Enter your credentials to continue.
                    </Typography>
                </Box>

                <Divider sx={{ opacity: 0.7 }} />

                {/* Email */}
                <Box>
                    <Typography sx={{ fontWeight: 800, mb: 0.75 }}>Email</Typography>
                    <TextField
                        fullWidth
                        type="email"
                        name="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        disabled={loading}
                        size="medium"
                    />
                </Box>

                {/* Password */}
                <Box>
                    <Typography sx={{ fontWeight: 800, mb: 0.75 }}>Password</Typography>
                    <TextField
                        fullWidth
                        type={showPass ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={loading}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPass((s) => !s)}
                                        edge="end"
                                        aria-label={showPass ? "Hide password" : "Show password"}
                                        disabled={loading}
                                    >
                                        {showPass ? (
                                            <VisibilityOffOutlinedIcon fontSize="small" />
                                        ) : (
                                            <VisibilityOutlinedIcon fontSize="small" />
                                        )}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {/* Forgot password */}
                <Box sx={{ mt: -0.5 }}>
                    <Link
                        component={RouterLink}
                        to="/forgot-password"
                        underline="hover"
                        sx={{ fontWeight: 700 }}
                    >
                        Forgot your password?
                    </Link>
                </Box>

                {/* Submit */}
                <Button
                    type="submit"
                    variant="contained"
                    disabled={disabled}
                    sx={{
                        mt: 0.5,
                        borderRadius: 3,
                        py: 1.4,
                        fontWeight: 900,
                        textTransform: "none",
                    }}
                >
                    {loading ? "Signing in…" : "Sign in"}
                </Button>

                {/* Footer */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                        pt: 0.5,
                    }}
                >
                </Box>
            </Stack>
        </Paper>
    );
}