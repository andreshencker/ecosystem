import * as React from "react";
import { Link } from "react-router-dom";
import { Avatar, Box, useMediaQuery, useTheme } from "@mui/material";

import { getCompanyBrand } from "@/app/lib/storage";

type Props = {
    to?: string;
    name?: string;
    logoUrl?: string;
    size?: "sm" | "md" | "lg";
    showText?: boolean;
};

export default function AppBrand({
                                     to = "/",
                                     name = "JTrade",
                                     logoUrl,
                                     size = "md",
                                 }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));

    const [storedBrand, setStoredBrand] = React.useState(() => getCompanyBrand());

    React.useEffect(() => {
        const syncBrand = () => {
            setStoredBrand(getCompanyBrand());
        };

        window.addEventListener("app:companyBrand", syncBrand);

        return () => {
            window.removeEventListener("app:companyBrand", syncBrand);
        };
    }, []);

    const sizes = {
        sm: 26,
        md: 32,
        lg: 40,
    } as const;

    const box = sizes[size];

    const resolvedName = storedBrand?.displayName?.trim() || name;
    const resolvedIconUrl = storedBrand?.logoIconUrl?.trim() || logoUrl || "";
    const resolvedFullLogoUrl = storedBrand?.logoFullUrl?.trim() || "";

    return (
        <Box
            component={Link}
            to={to}
            aria-label={resolvedName}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                textDecoration: "none",
                color: "inherit",
                minWidth: 0,
                flex: "0 0 auto",
            }}
        >
            {!isSmall && resolvedFullLogoUrl ? (
                <Box
                    component="img"
                    src={resolvedFullLogoUrl}
                    alt={resolvedName}
                    sx={{
                        height: box,
                        maxWidth: 180,
                        objectFit: "contain",
                        display: "block",
                        flex: "0 0 auto",
                    }}
                />
            ) : resolvedIconUrl ? (
                <Avatar
                    src={resolvedIconUrl}
                    alt={resolvedName}
                    variant="rounded"
                    sx={{
                        width: box,
                        height: box,
                        borderRadius: 2,
                        flex: "0 0 auto",
                        bgcolor: "background.paper",
                    }}
                >
                    {resolvedName?.[0]?.toUpperCase() ?? "J"}
                </Avatar>
            ) : (
                <Box
                    aria-hidden
                    sx={{
                        width: box,
                        height: box,
                        borderRadius: 2,
                        bgcolor: "warning.main",
                        flex: "0 0 auto",
                    }}
                />
            )}
        </Box>
    );
}