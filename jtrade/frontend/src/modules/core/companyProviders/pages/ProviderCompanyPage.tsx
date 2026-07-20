import * as React from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import CompanyProviderForm from "../components/CompanyProviderForm";
import CompanyProviderStatusCard from "../components/CompanyProviderStatusCard";

import {
    useCreateMyCompanyProvider,
    useMyCompanyProvider,
    useUpdateMyCompanyProvider,
} from "../hooks/useCompanyProviders";

import type { CreateCompanyProviderDto } from "../types/companyProvider";

export default function ProviderCompanyPage() {
    const qCompany = useMyCompanyProvider();
    const mCreate = useCreateMyCompanyProvider();
    const mUpdate = useUpdateMyCompanyProvider();

    const company = qCompany.data ?? null;
    const hasCompany = !!company?.id;

    const saving = mCreate.isPending || mUpdate.isPending;
    const loading = qCompany.isLoading || saving;

    const handleSubmit = async (dto: CreateCompanyProviderDto) => {
        if (saving) return;

        if (hasCompany) {
            await mUpdate.mutateAsync(dto);
            return;
        }

        await mCreate.mutateAsync(dto);
    };

    if (qCompany.isLoading) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 300,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                overflow: "auto",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                        Company Provider
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage your provider company profile before publishing trading projects.
                    </Typography>
                </Box>

                <CompanyProviderStatusCard company={company} />

                <CompanyProviderForm
                    initial={company}
                    loading={loading}
                    onSubmit={handleSubmit}
                />
            </Stack>
        </Box>
    );
}