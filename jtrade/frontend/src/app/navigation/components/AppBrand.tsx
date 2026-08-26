import * as React from "react";
import { Link } from "react-router-dom";
import { Avatar, Box, Typography } from "@mui/material";

// name/logoUrl always come from the Grapifly Applications catalogue (see
// AppConfigProvider) — every call site passes them explicitly, no local
// branding source of any kind.
type Props = {
    to?: string;
    name: string;
    logoUrl?: string;
    size?: "sm" | "md" | "lg";
    showText?: boolean;
};

export default function AppBrand({
                                     to = "/",
                                     name,
                                     logoUrl,
                                     size = "md",
                                     showText = true,
                                 }: Props) {
    const sizes = {
        sm: 26,
        md: 32,
        lg: 40,
    } as const;

    const box = sizes[size];

    return (
        <Box
            component={Link}
            to={to}
            aria-label={name}
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
            {logoUrl ? (
                <Avatar
                    src={logoUrl}
                    alt={name}
                    variant="rounded"
                    sx={{
                        width: box,
                        height: box,
                        borderRadius: 2,
                        flex: "0 0 auto",
                        bgcolor: "background.paper",
                    }}
                >
                    {name?.[0]?.toUpperCase() ?? "J"}
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
            {showText && (
                <Typography sx={{ fontWeight: 900, letterSpacing: "-.035em", whiteSpace: "nowrap" }}>
                    {name}
                </Typography>
            )}
        </Box>
    );
}
