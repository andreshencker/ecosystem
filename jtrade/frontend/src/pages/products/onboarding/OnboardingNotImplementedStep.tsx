import * as React from "react";
import { Box, Stack, Typography } from "@mui/material";

/**
 * Single reusable "Not implemented yet" content block, shared by every
 * Product Version + Support placeholder step in the onboarding wizard.
 *
 * Deliberately neutral — no error/warning/incomplete styling, no completion
 * state, nothing persisted. This is UI reuse only; it has no domain logic.
 */
export default function OnboardingNotImplementedStep() {
    return (
        <Stack spacing={2} sx={{ maxWidth: 640 }}>
            <Box
                sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 4,
                    textAlign: "center",
                    bgcolor: "action.hover",
                }}
            >
                <Typography variant="subtitle2" fontWeight={800} color="text.disabled">
                    Not implemented yet
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                    This part of the onboarding is coming soon.
                </Typography>
            </Box>
        </Stack>
    );
}
