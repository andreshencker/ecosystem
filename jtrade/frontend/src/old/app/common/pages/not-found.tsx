// FILE: src/app/pages/NotFoundPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import {
    Box,
    Button,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

export default function NotFoundPage() {
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
                "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: -200,
                    background:
                        "radial-gradient(closest-side, rgba(255,200,0,0.15), transparent 70%)",
                    filter: "blur(40px)",
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
                        bgcolor: "background.paper",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    {/* Badge */}
                    <Box
                        sx={{
                            display: "inline-flex",
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
                        ERROR
                    </Box>

                    {/* 404 */}
                    <Typography
                        variant="h1"
                        fontWeight={950}
                        sx={{
                            fontSize: { xs: 64, sm: 96 },
                            lineHeight: 1,
                            mb: 1,
                            letterSpacing: -2,
                        }}
                    >
                        404
                    </Typography>

                    {/* Title */}
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="center"
                        sx={{ mb: 1 }}
                    >
                        <ErrorOutlineRoundedIcon />
                        <Typography variant="h4" fontWeight={900}>
                            Page Not Found
                        </Typography>
                    </Stack>

                    {/* Description */}
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ maxWidth: 480, mx: "auto", mb: 3 }}
                    >
                        The page you are looking for might have been removed,
                        had its name changed, or is temporarily unavailable.
                    </Typography>

                    {/* Actions */}
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="center"
                    >
                        <Button
                            component={Link}
                            to="/"
                            variant="contained"
                            sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                px: 3,
                            }}
                        >
                            Go to Home
                        </Button>

                        <Button
                            component={Link}
                            to="/signin"
                            variant="outlined"
                            color="inherit"
                            sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                px: 3,
                            }}
                        >
                            Sign in
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </Box>
    );
}