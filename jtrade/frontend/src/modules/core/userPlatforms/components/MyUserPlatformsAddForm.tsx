import * as React from "react";
import {
    Avatar,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Typography,
} from "@mui/material";

import type { Platform } from "@/modules/core/platforms/types/platforms";

type Props = {
    platforms: Platform[];
    loading?: boolean;
    onAdd: (payload: { platformId: string }) => void | Promise<void>;
};

function getPlatformId(p: any): string {
    return String(p?.id ?? p?._id ?? "");
}

export default function MyUserPlatformsAddForm({
                                                   platforms,
                                                   loading,
                                                   onAdd,
                                               }: Props) {
    const [platformId, setPlatformId] = React.useState("");

    const canSubmit = !!platformId && !loading;

    const handleSubmit = async () => {
        if (!platformId) return;
        await onAdd({ platformId });
        setPlatformId("");
    };

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 4,
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            <Box sx={{ mb: 1.5 }}>
                <Typography variant="h6" fontWeight={800}>
                    Add platform
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Link a supported platform to your user account.
                </Typography>
            </Box>

            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ md: "center" }}
            >
                <FormControl fullWidth>
                    <InputLabel id="platform-select-label">Platform</InputLabel>

                    <Select
                        labelId="platform-select-label"
                        label="Platform"
                        value={platformId}
                        onChange={(e) => setPlatformId(String(e.target.value))}
                        disabled={loading}
                        renderValue={(val) => {
                            const p = platforms.find((x: any) => getPlatformId(x) === val);
                            return p ? p.name : "Platform";
                        }}
                    >
                        {platforms.length === 0 ? (
                            <MenuItem value="" disabled>
                                No active platforms available
                            </MenuItem>
                        ) : (
                            platforms.map((p: any) => {
                                const id = getPlatformId(p);

                                return (
                                    <MenuItem key={id} value={id}>
                                        <Stack direction="row" spacing={1.2} alignItems="center">
                                            <Avatar src={p.imageUrl} sx={{ width: 22, height: 22 }}>
                                                {p.name?.[0]?.toUpperCase() ?? "P"}
                                            </Avatar>

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={800} noWrap>
                                                    {p.name}
                                                </Typography>

                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {p.category} • {p.connectionType}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </MenuItem>
                                );
                            })
                        )}
                    </Select>
                </FormControl>

                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    sx={{
                        height: 44,
                        px: 3,
                        fontWeight: 900,
                        textTransform: "none",
                        minWidth: { xs: "100%", md: 120 },
                    }}
                >
                    Add
                </Button>
            </Stack>
        </Paper>
    );
}