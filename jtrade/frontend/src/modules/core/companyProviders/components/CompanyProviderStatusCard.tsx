import { Box, Paper, Stack, Typography } from "@mui/material";
import StatusChip from "@/app/common/components/StatusChip";

import type { CompanyProvider } from "../types/companyProvider";

type Props = {
    company?: CompanyProvider | null;
};

export default function CompanyProviderStatusCard({ company }: Props) {
    if (!company) {
        return (
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 4,
                    p: { xs: 1.5, sm: 2 },
                    border: "1px dashed",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    You do not have a provider company yet. Complete the form to create one.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 4,
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <Stack spacing={1.5}>
                <Box>
                    <Typography variant="body2" color="text.secondary">
                        Provider status
                    </Typography>

                    <Typography variant="h6" fontWeight={900}>
                        {company.companyName}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <StatusChip label={company.status} color="default" />
                    <StatusChip
                        label={company.isVerified ? "Verified" : "Not verified"}
                        color={company.isVerified ? "success" : "default"}
                    />
                    <StatusChip
                        label={company.isActive ? "Active" : "Inactive"}
                        color={company.isActive ? "success" : "default"}
                    />
                </Stack>
            </Stack>
        </Paper>
    );
}