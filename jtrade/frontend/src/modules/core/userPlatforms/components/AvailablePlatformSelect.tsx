// src/modules/userPlatforms/components/AvailablePlatformSelect.tsx
import * as React from "react";
import {
    Avatar,
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from "@mui/material";

import type { Platform } from "@/modules/core/platforms/types/platforms";

type Props = {
    label?: string;
    options: Platform[];         // <- missingPlatforms
    value: string;               // "" o platformId
    onChange: (platformId: string) => void;
    disabled?: boolean;
};

function getId(p: any): string {
    return String(p?.id ?? p?._id ?? "");
}

export default function AvailablePlatformSelect({
                                                    label = "Select platform",
                                                    options,
                                                    value,
                                                    onChange,
                                                    disabled,
                                                }: Props) {
    if (!options.length) {
        return (
            <Box
                sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    You already have all supported platforms configured.
                </Typography>
            </Box>
        );
    }

    return (
        <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel>{label}</InputLabel>

            <Select
                label={label}
                value={value}
                onChange={(e) => onChange(String(e.target.value))}
                renderValue={(selectedId) => {
                    if (!selectedId) {
                        return <Typography color="text.secondary">Select a platform</Typography>;
                    }
                    const p = options.find((x: any) => getId(x) === selectedId);
                    if (!p) return <Typography color="text.secondary">Select a platform</Typography>;

                    return (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar
                                src={(p as any).imageUrl as string | undefined}
                                sx={{ width: 22, height: 22 }}
                            />
                            <Typography sx={{ textTransform: "capitalize", fontWeight: 700 }}>
                                {(p as any).name ?? "Platform"}
                            </Typography>
                        </Stack>
                    );
                }}
            >
                {/* ✅ opción vacía */}
                <MenuItem value="">
                    <Typography color="text.secondary">Select a platform</Typography>
                </MenuItem>

                {options.map((p: any) => {
                    const pid = getId(p);
                    return (
                        <MenuItem key={pid} value={pid}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar
                                    src={(p as any).imageUrl as string | undefined}
                                    sx={{ width: 22, height: 22 }}
                                />
                                <Typography sx={{ textTransform: "capitalize", fontWeight: 700 }}>
                                    {(p as any).name ?? "Platform"}
                                </Typography>
                            </Stack>
                        </MenuItem>
                    );
                })}
            </Select>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
                Select a platform to start the connection process.
            </Typography>
        </FormControl>
    );
}