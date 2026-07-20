// src/app/common/components/StatusChip.tsx
import * as React from "react";
import {alpha, Chip, useTheme} from "@mui/material";

type StatusChipColor = "default" | "success" | "warning" | "error" | "info";

type Props = {
    label: React.ReactNode;
    color?: StatusChipColor;
    dense?: boolean;
    icon?: React.ReactNode;
};

export default function StatusChip({
                                       label,
                                       color = "default",
                                       dense = true,
                                       icon,
                                   }: Props) {
    const theme = useTheme();
    const {mode, success, warning, error, info, grey} = theme.palette;

    const commonRadius = 999;

    const tokens = (() => {
        switch (color) {
            case "success":
                return {
                    bg:
                        mode === "dark"
                            ? alpha(success.main, 0.28)
                            : alpha(success.main, 0.18),
                    text: mode === "dark" ? success.light : success.dark,
                    border: alpha(success.main, 0.5),
                };
            case "warning":
                return {
                    bg:
                        mode === "dark"
                            ? alpha(warning.main, 0.3)
                            : alpha(warning.main, 0.2),
                    text: mode === "dark" ? warning.light : warning.dark,
                    border: alpha(warning.main, 0.5),
                };
            case "error":
                return {
                    bg:
                        mode === "dark"
                            ? alpha(error.main, 0.32)
                            : alpha(error.main, 0.22),
                    text: mode === "dark" ? error.light : error.dark,
                    border: alpha(error.main, 0.55),
                };
            case "info":
                return {
                    bg:
                        mode === "dark"
                            ? alpha(info.main, 0.32)
                            : alpha(info.main, 0.2),
                    text: mode === "dark" ? info.light : info.dark,
                    border: alpha(info.main, 0.5),
                };
            default:
                return {
                    bg:
                        mode === "dark"
                            ? alpha(grey[800], 0.9)
                            : alpha(grey[200], 0.9),
                    text: mode === "dark" ? grey[50] : grey[800],
                    border:
                        mode === "dark"
                            ? alpha(grey[600], 0.8)
                            : alpha(grey[400], 0.9),
                };
        }
    })();

    return (
        <Chip
            icon={icon}
            label={label}
            size={dense ? "small" : "medium"}
            variant="outlined"
            sx={{
                borderRadius: commonRadius,
                px: dense ? 1.5 : 2,
                fontSize: dense ? 12 : 13,
                fontWeight: 600,
                bgcolor: tokens.bg,
                color: tokens.text,
                borderColor: tokens.border,
                "& .MuiChip-label": {
                    px: 0,
                },
            }}
        />
    );
}