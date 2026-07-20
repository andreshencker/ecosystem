import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    getCompanyById,
    updateCompanyByKey,
} from "../api/companyInfo.api";
import type { UpdateCompanyDto } from "../types/companyInfo.types";
import { setCompanyBrand } from "@/app/lib/storage";

const COMPANY_ID = import.meta.env.VITE_SYSTEM_COMPANY_ID;

export function useCompanyInfo() {
    return useQuery({
        queryKey: ["company-info", COMPANY_ID],
        queryFn: async () => {
            const company = await getCompanyById(COMPANY_ID);

            setCompanyBrand({
                companyKey: company.companyKey,
                displayName: company.displayName,
                logoIconUrl: company.logoIconUrl,
                logoFullUrl: company.logoFullUrl,
            });

            return company;
        },
        enabled: !!COMPANY_ID,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    });
}

export function useUpdateCompany() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
                         companyKey,
                         data,
                     }: {
            companyKey: string;
            data: UpdateCompanyDto;
        }) => updateCompanyByKey(companyKey, data),

        onSuccess: async (company) => {
            setCompanyBrand({
                companyKey: company.companyKey,
                displayName: company.displayName,
                logoIconUrl: company.logoIconUrl,
                logoFullUrl: company.logoFullUrl,
            });

            toast.success("Company updated successfully.");
            await qc.invalidateQueries({ queryKey: ["company-info", COMPANY_ID] });
        },

        onError: (error: any) => {
            const message =
                error?.response?.data?.message?.[0] ||
                error?.response?.data?.message ||
                error?.message ||
                "Could not update company.";

            toast.error(message);
            console.error("Update company error:", error?.response?.data ?? error);
        },
    });
}