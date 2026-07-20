import React from "react";
import { Box, Container } from "@mui/material";
import SignInForm from "@/modules/core/auth/components/SignInForm";
import SignInMarketingPanel from "@/modules/core/auth/components/SignInMarketingPanel";

export default function LoginPage() {
    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Container maxWidth="lg">
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
                        gap: { xs: 4, md: 6 },
                        alignItems: "start",
                    }}
                >
                    {/* Left */}
                    <SignInMarketingPanel />

                    {/* Right */}
                    <SignInForm />
                </Box>
            </Container>
        </Box>
    );
}