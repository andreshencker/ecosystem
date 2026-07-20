import * as React from "react";
import {Chip, type ChipProps} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

export type AccountTagVariant = "active" | "selected" | "default";

type Props = {
    variant: AccountTagVariant;
    label?: string;
    size?: ChipProps["size"];
};

export default function AccountTagChip({
                                           variant,
                                           label,
                                           size = "small",
                                       }: Props) {
    const isActive = variant === "active";
    const isSelected = variant === "selected";
    const isDefault = variant === "default";

    const finalLabel =
        label ??
        (isActive ? "Active" : isSelected ? "Selected" : isDefault ? "Default" : "");

    return (
        <Chip
            size={size}
            icon={isActive ? <CheckCircleRoundedIcon fontSize="small"/> : undefined}
            label={finalLabel}
            variant="outlined"
            sx={{
                height: 22,
                borderRadius: 2, // ✅ NO pill exagerado
                fontSize: 12,
                fontWeight: 600,
                px: 0.6,

                ...(isActive && {
                    color: "success.main",
                    borderColor: "success.main",
                    bgcolor: "transparent",
                    "& .MuiChip-icon": {
                        color: "success.main",
                        fontSize: 16,
                        ml: 0.5,
                    },
                }),

                ...(isSelected && {
                    color: "warning.main",
                    borderColor: "warning.main",
                    bgcolor: "transparent",
                }),

                ...(isDefault && {
                    color: "primary.main",
                    borderColor: "primary.main",
                    bgcolor: "transparent",
                }),
            }}
        />
    );
}