import { Container, Card, CardContent, Typography, Button, Chip, Stack, Box, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function ClientDashboard() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const brand = theme.palette.primary.main;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Card
                sx={{
                    borderRadius: 3,
                    p: { xs: 2, md: 3 },
                }}
            >
                <CardContent sx={{ p: 0 }}>
                    {/* Header Row */}
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={2}
                    >
                        <Chip
                            label="CLIENT"
                            sx={{
                                fontWeight: 900,
                                borderRadius: 999,
                                bgcolor: `${brand}24`,
                                border: `1px solid ${brand}59`,
                                color: "text.primary",
                            }}
                        />

                        <Button
                            component={RouterLink}
                            to="/settings"
                            variant="outlined"
                            size="small"
                        >
                            Settings
                        </Button>
                    </Stack>

                    {/* Title */}
                    <Typography
                        variant="h2"
                        sx={{
                            mt: 3,
                            fontSize: { xs: 24, md: 28 },
                        }}
                    >
                        Client Dashboard
                    </Typography>

                    {/* Description */}
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 1,
                            color: theme.palette.text.secondary,
                            maxWidth: 600,
                        }}
                    >
                        Main overview page for users with the{" "}
                        <Box component="span" sx={{ fontWeight: 700 }}>
                            client
                        </Box>{" "}
                        role.
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
}
