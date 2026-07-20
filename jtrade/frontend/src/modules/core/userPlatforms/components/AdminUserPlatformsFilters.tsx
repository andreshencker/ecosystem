import * as React from "react";
import {
    Avatar,
    Box,
    Button,
    Grid,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import type {
    ListAdminUserPlatformsParams,
    UserPlatformStatus,
} from "@/modules/core/userPlatforms/api/userPlatforms";

// ✅ reutilizamos hooks existentes
import { useUsers } from "@/modules/core/users/hooks/useUsers";
import { usePlatforms } from "@/modules/core/platforms/hooks/usePlatforms";

const ROLE_OPTIONS = ["admin", "client", "investor"] as const;
const STATUS_OPTIONS: UserPlatformStatus[] = ["Pending", "Connected", "Disconnected"];

type Props = {
    value: ListAdminUserPlatformsParams;
    onChange: (next: ListAdminUserPlatformsParams) => void;
    onApply?: () => void;
    onReset?: () => void;
};

export default function AdminUserPlatformsFilters({
                                                      value,
                                                      onChange,
                                                      onApply,
                                                      onReset,
                                                  }: Props) {
    const set = (patch: Partial<ListAdminUserPlatformsParams>) => {
        onChange({ ...value, ...patch });
    };

    // ==========================
    // DATA SOURCES
    // ==========================
    const usersQ = useUsers();
    const platformsQ = usePlatforms({ isActive: true }); // si tu API soporta esto

    const users = (usersQ.data as any[]) ?? [];
    const platforms = platformsQ.data ?? [];

    // ==========================
    // WIDTHS
    // ==========================
    const W = {
        user: { xs: "100%", md: 260 },
        platform: { xs: "100%", md: 260 },
        role: { xs: "100%", md: 170 },
        status: { xs: "100%", md: 180 },
        active: { xs: "100%", md: 170 },
    } as const;

    const isLoading = usersQ.isLoading || platformsQ.isLoading;

    return (
        <Box
            sx={{
                mb: 2,
                p: 2,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>
                Filters
            </Typography>

            <Grid container spacing={2} alignItems="center">
                {/* USER */}
                <Grid item xs={12} md="auto">
                    <TextField
                        select
                        label="User"
                        value={value.userId ?? ""}
                        onChange={(e) => set({ userId: e.target.value || undefined })}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: W.user.md, width: W.user }}
                        disabled={isLoading}
                    >
                        <MenuItem value="">Any</MenuItem>

                        {users.map((u) => {
                            const id = u.id ?? u._id;
                            const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
                            const email = u.email ?? "";

                            return (
                                <MenuItem key={id} value={id}>
                                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                                        <Avatar src={u.avatarUrl} sx={{ width: 22, height: 22 }}>
                                            {(u.firstName?.[0] ?? u.email?.[0] ?? "U").toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={800} noWrap>
                                                {fullName || email || id}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {email}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </MenuItem>
                            );
                        })}
                    </TextField>
                </Grid>

                {/* PLATFORM */}
                <Grid item xs={12} md="auto">
                    <TextField
                        select
                        label="Platform"
                        value={value.platformId ?? ""}
                        onChange={(e) => set({ platformId: e.target.value || undefined })}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: W.platform.md, width: W.platform }}
                        disabled={isLoading}
                        SelectProps={{
                            renderValue: (val) => {
                                const p = platforms.find((x) => x.id === val);
                                return p ? p.name : String(val);
                            },
                        }}
                    >
                        <MenuItem value="">Any</MenuItem>

                        {platforms.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                                    <Avatar src={p.imageUrl} sx={{ width: 22, height: 22 }}>
                                        {(p.name?.[0] ?? "P").toUpperCase()}
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
                        ))}
                    </TextField>
                </Grid>

                {/* ROLE */}
                <Grid item xs={12} md="auto">
                    <TextField
                        select
                        label="Role"
                        value={value.role ?? ""}
                        onChange={(e) => set({ role: (e.target.value as any) || undefined })}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: W.role.md, width: W.role }}
                    >
                        <MenuItem value="">Any</MenuItem>
                        {ROLE_OPTIONS.map((r) => (
                            <MenuItem key={r} value={r}>
                                {r}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                {/* STATUS */}
                <Grid item xs={12} md="auto">
                    <TextField
                        select
                        label="Status"
                        value={value.status ?? ""}
                        onChange={(e) => set({ status: (e.target.value as any) || undefined })}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: W.status.md, width: W.status }}
                    >
                        <MenuItem value="">Any</MenuItem>
                        {STATUS_OPTIONS.map((s) => (
                            <MenuItem key={s} value={s}>
                                {s}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                {/* ACTIVE */}
                <Grid item xs={12} md="auto">
                    <TextField
                        select
                        label="Is active"
                        value={typeof value.isActive === "boolean" ? String(value.isActive) : ""}
                        onChange={(e) =>
                            set({ isActive: e.target.value === "" ? undefined : e.target.value === "true" })
                        }
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: W.active.md, width: W.active }}
                    >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="true">true</MenuItem>
                        <MenuItem value="false">false</MenuItem>
                    </TextField>
                </Grid>

                {/* ACTIONS */}
                <Grid
                    item
                    xs={12}
                    md
                    sx={{
                        display: "flex",
                        justifyContent: { xs: "stretch", md: "flex-end" },
                        gap: 1,
                    }}
                >
                    {onReset && (
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={onReset}
                            sx={{ minWidth: 110, height: 40 }}
                        >
                            Reset
                        </Button>
                    )}

                    {onApply && (
                        <Button
                            variant="contained"
                            onClick={onApply}
                            sx={{ fontWeight: 900, minWidth: 120, height: 40 }}
                        >
                            Apply
                        </Button>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
}