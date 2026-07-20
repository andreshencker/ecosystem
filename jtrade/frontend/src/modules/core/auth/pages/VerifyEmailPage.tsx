// FILE: src/modules/auth/pages/VerifyEmailPage.tsx
import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";

import { verifyEmailApi } from "@/modules/core/auth/api/auth";

type Status = "idle" | "loading" | "ok" | "error";

export default function VerifyEmailPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const token = React.useMemo(() => params.get("token") || "", [params]);

    const [status, setStatus] = React.useState<Status>("idle");
    const [message, setMessage] = React.useState<string>("");

    React.useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Missing token. Please check your email link again.");
            return;
        }

        let alive = true;

        (async () => {
            setStatus("loading");
            try {
                const res = await verifyEmailApi({ token });
                if (!alive) return;

                if (res?.verified) {
                    setStatus("ok");
                    setMessage("Your email has been verified. You can sign in now.");
                    toast.success("Email verified!");

                    const t = setTimeout(() => {
                        navigate("/signin", { replace: true });
                    }, 1500);

                    return () => clearTimeout(t);
                }

                setStatus("error");
                setMessage("Could not verify email. The link may be invalid.");
            } catch (e: any) {
                if (!alive) return;

                setStatus("error");
                const msg =
                    e?.response?.data?.message ||
                    e?.message ||
                    "Verification failed. The link may be expired.";

                setMessage(typeof msg === "string" ? msg : "Verification failed.");
                toast.error("Verification failed");
            }
        })();

        return () => {
            alive = false;
        };
    }, [token, navigate]);

    const isLoading = status === "loading";
    const isOk = status === "ok";
    const isError = status === "error";

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                px: 2,
                bgcolor: "background.default",
                position: "relative",
                overflow: "hidden",
                // glow background similar a tu screenshot
                "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: -200,
                    background:
                        "radial-gradient(closest-side, rgba(255,200,0,0.18), transparent 65%)",
                    filter: "blur(30px)",
                    pointerEvents: "none",
                },
            }}
        >
            <Box sx={{ width: "100%", maxWidth: 980, position: "relative" }}>
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        border: "1px solid",
                        borderColor: "divider",
                        p: { xs: 3, sm: 5 },
                        textAlign: "center",
                        // glassy look
                        bgcolor: "background.paper",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    {/* Badge */}
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            px: 2,
                            py: 0.6,
                            borderRadius: 999,
                            bgcolor: "warning.main",
                            color: "black",
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: 1,
                            mb: 2,
                        }}
                    >
                        VERIFY
                    </Box>

                    {/* Title */}
                    <Typography
                        variant="h3"
                        fontWeight={950}
                        sx={{ letterSpacing: -0.5, mb: 1 }}
                    >
                        Verify Email
                    </Typography>

                    {/* Subtitle */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        We’re confirming your email address.
                    </Typography>

                    {/* Status panel (centered) */}
                    <Box
                        sx={{
                            maxWidth: 620,
                            mx: "auto",
                            borderRadius: 4,
                            border: "1px solid",
                            borderColor: "divider",
                            p: { xs: 2.25, sm: 3 },
                            textAlign: "left",
                            bgcolor: "rgba(255,255,255,0.02)",
                        }}
                    >
                        {status === "idle" && (
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <MarkEmailReadRoundedIcon sx={{ opacity: 0.9 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Waiting for token…
                                </Typography>
                            </Stack>
                        )}

                        {isLoading && (
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <CircularProgress size={18} />
                                <Typography variant="body2" fontWeight={800}>
                                    Verifying your email…
                                </Typography>
                            </Stack>
                        )}

                        {isOk && (
                            <Stack spacing={1.25}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <CheckCircleRoundedIcon />
                                    <Typography variant="body2" fontWeight={900}>
                                        Verified
                                    </Typography>
                                </Stack>

                                <Typography variant="body2" color="text.secondary">
                                    {message}
                                </Typography>

                                <Typography variant="caption" color="text.secondary">
                                    Redirecting to <b>Sign In</b>…
                                </Typography>
                            </Stack>
                        )}

                        {isError && (
                            <Stack spacing={1.25}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <ErrorRoundedIcon />
                                    <Typography variant="body2" fontWeight={900}>
                                        Verification failed
                                    </Typography>
                                </Stack>

                                <Typography variant="body2" color="text.secondary">
                                    {message}
                                </Typography>

                                <Typography variant="caption" color="text.secondary">
                                    If this link is expired, request a new verification email from
                                    the sign-in page.
                                </Typography>
                            </Stack>
                        )}
                    </Box>

                    {/* Buttons like screenshot: centered */}
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="center"
                        sx={{ mt: 3 }}
                    >
                        <Button
                            component={Link}
                            to="/"
                            variant="outlined"
                            color="inherit"
                            disabled={isLoading}
                            sx={{ textTransform: "none", fontWeight: 800, px: 3 }}
                        >
                            Home
                        </Button>

                        <Button
                            component={Link}
                            to="/signin"
                            variant="contained"
                            disabled={isLoading}
                            sx={{ textTransform: "none", fontWeight: 900, px: 3 }}
                        >
                            Sign in
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </Box>
    );
}