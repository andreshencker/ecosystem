// FILE: src/app/common/layout/client/components/AddPlatformSelect.tsx
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
import type { UserPlatform } from "@/modules/core/userPlatforms/types/userPlatforms";

type Mode = "onboarding" | "user-platforms";

interface Props {
    label?: string;
    mode: Mode;

    /** Catálogo completo de plataformas (GET /platforms) */
    platforms: Platform[];

    /** Plataformas que el usuario ya tiene (GET /user-platforms) */
    userPlatforms?: UserPlatform[];

    /** ID de la plataforma seleccionada (platform.id) */
    value: string;

    onChange: (platformId: string) => void;

    disabled?: boolean;
}

/** Normaliza id: soporta id o _id */
function getId(x: any): string {
    return String(x?.id ?? x?._id ?? "");
}

function normalizeCodeOrName(p: any): string {
    return String(p?.code ?? p?.name ?? "")
        .trim()
        .toLowerCase();
}

/** Devuelve plataformas disponibles (excluye las que ya tiene el user si mode=user-platforms) */
function getAvailablePlatforms(
    mode: Mode,
    catalog: Platform[],
    userPlatforms?: UserPlatform[]
): Platform[] {
    const list = catalog ?? [];

    // En onboarding: mostramos todo el catálogo (o puedes filtrar isActive/isSupported si quieres)
    if (mode === "onboarding") return list;

    // En "user-platforms": excluir las que ya tiene configuradas
    const ownedIds = new Set<string>();
    const ownedCodes = new Set<string>();

    (userPlatforms ?? []).forEach((up: any) => {
        // up.platformId suele ser string (id de Platform)
        if (up?.platformId) ownedIds.add(String(up.platformId));

        // up.platform viene populado en tu backend listMine()
        const codeOrName = normalizeCodeOrName(up?.platform);
        if (codeOrName) ownedCodes.add(codeOrName);
    });

    return list.filter((p: any) => {
        const pid = getId(p);
        const codeOrName = normalizeCodeOrName(p);

        if (pid && ownedIds.has(pid)) return false;
        if (codeOrName && ownedCodes.has(codeOrName)) return false;

        return true;
    });
}

export default function AddPlatformSelect({
                                              label = "Select platform",
                                              mode,
                                              platforms,
                                              userPlatforms,
                                              value,
                                              onChange,
                                              disabled,
                                          }: Props) {
    const options = React.useMemo(
        () => getAvailablePlatforms(mode, platforms, userPlatforms),
        [mode, platforms, userPlatforms]
    );

    // Si no hay ninguna plataforma disponible → mensaje en vez de select
    if (options.length === 0) {
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
                    All platforms have already been configured.
                </Typography>
            </Box>
        );
    }

    const selected = options.find((p: any) => getId(p) === value);

    return (
        <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel>{label}</InputLabel>

            <Select
                label={label}
                value={value}
                onChange={(e) => onChange(String(e.target.value))}
                renderValue={(selectedId) => {
                    const p = options.find((x: any) => getId(x) === selectedId);

                    if (!p) {
                        return <Typography color="text.secondary">{label}</Typography>;
                    }

                    return (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar
                                src={(p as any).imageUrl as string | undefined}
                                sx={{ width: 22, height: 22 }}
                            />
                            <Typography sx={{ textTransform: "capitalize" }}>
                                {(p as any).name ?? "Platform"}
                            </Typography>
                        </Stack>
                    );
                }}
            >
                {options.map((p: any) => {
                    const pid = getId(p);
                    return (
                        <MenuItem key={pid} value={pid}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar
                                    src={(p as any).imageUrl as string | undefined}
                                    sx={{ width: 22, height: 22 }}
                                />
                                <Typography sx={{ textTransform: "capitalize" }}>
                                    {(p as any).name ?? "Platform"}
                                </Typography>
                            </Stack>
                        </MenuItem>
                    );
                })}
            </Select>

            {/* opcional: helper */}
            {/* <FormHelperText>Select a platform to add it to your account.</FormHelperText> */}
        </FormControl>
    );
}