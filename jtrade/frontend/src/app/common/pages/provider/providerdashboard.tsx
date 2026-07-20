import { Box, Paper, Stack, Typography } from "@mui/material";

export default function ProviderDashboard() {
    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100%",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                        Provider Dashboard
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage your company, trading projects, supported platforms and code versions.
                    </Typography>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        p: { xs: 1.5, sm: 2.5 },
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                    }}
                >
                    <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
                        Welcome to your provider area
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Start by completing your company profile. After that, you will be able to create projects, assign platforms and upload versions.
                    </Typography>
                </Paper>
            </Stack>
        </Box>
    );
}