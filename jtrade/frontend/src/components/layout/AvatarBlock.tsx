// src/components/layout/AvatarBlock.tsx
import * as React from "react";
import { Avatar, Box, Typography } from "@mui/material";
import type { AuthUser } from "@/old/modules/core/auth/types/auth";
import { useAuth } from "@/old/modules/core/auth/hooks/useAuth";

type Props = {
    size?: number;
    showName?: boolean;
    className?: string;
    variant?: "default" | "sidebar";
};

export default function AvatarBlock({
                                        size = 56,
                                        showName = true,
                                        className,
                                        variant = "default",
                                    }: Props) {
    const { user } = useAuth();

    const typedUser = user as AuthUser | null;

    const fullName =
        [typedUser?.firstName, typedUser?.lastName].filter(Boolean).join(" ").trim() ||
        "User";

    const initials = React.useMemo(() => {
        const a = (typedUser?.firstName || "").trim()[0]?.toUpperCase() ?? "U";
        const b = (typedUser?.lastName || "").trim()[0]?.toUpperCase() ?? "";
        return `${a}${b}`;
    }, [typedUser?.firstName, typedUser?.lastName]);

    const avatarUrl = typedUser?.avatarUrl || "";

    return (
        <Box className={className} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar
                src={avatarUrl || undefined}
                alt={fullName}
                sx={{
                    width: size,
                    height: size,
                    fontWeight: 700,
                    bgcolor: variant === "sidebar" ? "grey.900" : "background.paper",
                    color: variant === "sidebar" ? "grey.100" : "text.primary",
                    border: 1,
                    borderColor: "divider",
                }}
            >
                {initials}
            </Avatar>

            {showName && (
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {fullName}
                    </Typography>

                    {typedUser?.email && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block" }}
                            title={typedUser.email}
                        >
                            {typedUser.email}
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
}