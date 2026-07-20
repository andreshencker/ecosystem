import * as React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import toast from "react-hot-toast";

import CompanyInfoForm from "../components/CompanyInfoForm";
import { useCompanyInfo, useUpdateCompany } from "../hooks/useCompanyInfo";

export default function CompanyInfoPage() {
    const q = useCompanyInfo();
    const m = useUpdateCompany();

    if (q.isLoading) {
        return (
            <Box
                sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (q.isError) {
        return (
            <Box textAlign="center">
                <Typography color="error.main">
                    Could not load company information.
                </Typography>
            </Box>
        );
    }

    if (!q.data) {
        return (
            <Box textAlign="center">
                <Typography>No company found</Typography>
            </Box>
        );
    }

    const company = q.data;

    return (
        <Box
            sx={{
                px: { xs: 2, md: 3 },
                py: { xs: 2, md: 3 },
            }}
        >
            <Box sx={{ mb: 2 }}>
                <Typography variant="h4" fontWeight={900}>
                    Company Info
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your company configuration inside communications.
                </Typography>
            </Box>

            <CompanyInfoForm
                initial={company}
                loading={m.isPending}
                onSubmit={async (values) => {
                    try {
                        await m.mutateAsync({
                            companyKey: company.companyKey,
                            data: values,
                        });
                    } catch (error) {
                        console.error("CompanyInfoPage submit error:", error);
                    }
                }}
            />
        </Box>
    );
}