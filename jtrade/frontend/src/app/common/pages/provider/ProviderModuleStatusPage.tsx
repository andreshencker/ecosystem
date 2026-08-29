import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";

type Props = {
    title: string;
    description: string;
    nextStep: string;
};

export default function ProviderModuleStatusPage({ title, description, nextStep }: Props) {
    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto" }}>
            <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                    <Stack spacing={2.5} alignItems="flex-start">
                        <Chip
                            icon={<ConstructionRoundedIcon />}
                            label="MIGRATION IN PROGRESS"
                            color="warning"
                            variant="outlined"
                        />
                        <Box>
                            <Typography variant="h3" fontWeight={900}>{title}</Typography>
                            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                                {description}
                            </Typography>
                        </Box>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover", width: "100%" }}>
                            <Typography variant="overline" color="text.secondary">Next migration step</Typography>
                            <Typography fontWeight={700}>{nextStep}</Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}

