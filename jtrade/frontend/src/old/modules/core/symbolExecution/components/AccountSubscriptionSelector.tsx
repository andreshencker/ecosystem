import * as React from "react";

import {
    Avatar,
    Box,
    Button,
    MenuItem,
    Stack,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";

import { useMyUserAccountInfos } from "@/old/modules/core/userAccountInfo/hooks/useUserAccountInfo";

type Props = {
    selectedProjectPlatformId: string | null;
    selectedAccountId: string | null;
    onSelectProjectPlatform: (id: string | null) => void;
    onSelectAccount: (id: string | null) => void;
    onAdd: () => void;
};

function getAccountProjectPlatformId(account: any) {
    return String(
        account?.userProjectPlatformId ??
        account?.userProjectPlatform?.id ??
        "",
    );
}

function getProjectName(account: any) {
    return (
        account?.userProjectPlatform?.projectCodePlatform?.codeProject?.name ??
        "Project"
    );
}

function getPlatformName(account: any) {
    return (
        account?.userProjectPlatform?.projectCodePlatform?.platform?.name ??
        "Platform"
    );
}

function getPlatformImage(account: any) {
    return (
        account?.userProjectPlatform?.projectCodePlatform?.platform?.imageUrl ??
        ""
    );
}

function getRuntimeMode(account: any) {
    return (
        account?.userProjectPlatform?.projectCodePlatform?.runtimeMode ?? "-"
    );
}

function getIndicatorName(account: any) {
    return (
        account?.indicatorProject?.indicator?.name ??
        account?.indicatorProject?.indicator?.key ??
        "-"
    );
}

export default function AccountSubscriptionSelector({
                                                        selectedProjectPlatformId,
                                                        selectedAccountId,
                                                        onSelectProjectPlatform,
                                                        onSelectAccount,
                                                        onAdd,
                                                    }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    const { data: accounts = [], isLoading } = useMyUserAccountInfos();

    const projectOptions = React.useMemo(() => {
        const map = new Map<string, any>();

        for (const account of accounts as any[]) {
            const id = getAccountProjectPlatformId(account);
            if (!id) continue;

            if (!map.has(id)) {
                map.set(id, account);
            }
        }

        return Array.from(map.values());
    }, [accounts]);

    const accountOptions = React.useMemo(() => {
        if (!selectedProjectPlatformId) return [];

        return (accounts as any[]).filter((account) => {
            return (
                getAccountProjectPlatformId(account) ===
                String(selectedProjectPlatformId)
            );
        });
    }, [accounts, selectedProjectPlatformId]);

    const selectedProject = React.useMemo(() => {
        if (!selectedProjectPlatformId) return null;

        return (
            projectOptions.find(
                (account: any) =>
                    getAccountProjectPlatformId(account) ===
                    String(selectedProjectPlatformId),
            ) ?? null
        );
    }, [projectOptions, selectedProjectPlatformId]);

    const selectedAccount = React.useMemo(() => {
        if (!selectedAccountId) return null;

        return (
            accountOptions.find(
                (account: any) =>
                    String(account.id) === String(selectedAccountId),
            ) ?? null
        );
    }, [accountOptions, selectedAccountId]);

    return (
        <Box
            sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                p: 2,
                mb: 2,
                bgcolor: "background.paper",
            }}
        >
            <Stack
                direction={isSmall ? "column" : "row"}
                spacing={2}
                alignItems={isSmall ? "stretch" : "flex-end"}
            >
                <Box sx={{ flex: 1, minWidth: 260 }}>
                    <TextField
                        select
                        fullWidth
                        label="Project"
                        value={selectedProjectPlatformId ?? ""}
                        onChange={(e) => {
                            onSelectProjectPlatform(e.target.value || null);
                        }}
                        disabled={isLoading}
                        InputLabelProps={{ shrink: true }}
                        helperText="Select the project first."
                        SelectProps={{
                            renderValue: () => {
                                if (!selectedProject) {
                                    return <em>Select project...</em>;
                                }

                                return (
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                        <Avatar
                                            src={getPlatformImage(selectedProject) || undefined}
                                            variant="rounded"
                                            sx={{ width: 24, height: 24 }}
                                        />

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={900} noWrap>
                                                {getProjectName(selectedProject)}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {getPlatformName(selectedProject)} · {getRuntimeMode(selectedProject)}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                );
                            },
                        }}
                    >
                        <MenuItem value="">
                            <em>Select project...</em>
                        </MenuItem>

                        {projectOptions.map((account: any) => {
                            const id = getAccountProjectPlatformId(account);

                            return (
                                <MenuItem key={id} value={id}>
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                        <Avatar
                                            src={getPlatformImage(account) || undefined}
                                            variant="rounded"
                                            sx={{ width: 24, height: 24 }}
                                        />

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={900} noWrap>
                                                {getProjectName(account)}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {getPlatformName(account)} · {getRuntimeMode(account)}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </MenuItem>
                            );
                        })}
                    </TextField>
                </Box>

                <Box sx={{ flex: 1, minWidth: 260 }}>
                    <TextField
                        select
                        fullWidth
                        label="Account"
                        value={selectedAccountId ?? ""}
                        onChange={(e) => onSelectAccount(e.target.value || null)}
                        disabled={isLoading || !selectedProjectPlatformId}
                        InputLabelProps={{ shrink: true }}
                        helperText="Filtered by selected project."
                        SelectProps={{
                            renderValue: () => {
                                if (!selectedAccount) {
                                    return <em>Select account...</em>;
                                }

                                return (
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                        <Avatar
                                            src={getPlatformImage(selectedAccount) || undefined}
                                            variant="rounded"
                                            sx={{ width: 24, height: 24 }}
                                        />

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={900} noWrap>
                                                {selectedAccount.accountRef ?? "—"} / {getIndicatorName(selectedAccount)}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {selectedAccount.accountLabel ?? ""}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                );
                            },
                        }}
                    >
                        <MenuItem value="">
                            <em>Select account...</em>
                        </MenuItem>

                        {accountOptions.map((account: any) => (
                            <MenuItem key={account.id} value={account.id}>
                                <Stack direction="row" spacing={1.2} alignItems="center">
                                    <Avatar
                                        src={getPlatformImage(account) || undefined}
                                        variant="rounded"
                                        sx={{ width: 24, height: 24 }}
                                    />

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={900} noWrap>
                                            {account.accountRef ?? "—"} / {getIndicatorName(account)}
                                        </Typography>

                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {account.accountLabel ?? ""}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>

                <Box sx={{ flex: "0 0 auto" }}>
                    <Button
                        variant="contained"
                        startIcon={<AddRoundedIcon />}
                        onClick={onAdd}
                        disabled={!selectedProjectPlatformId || !selectedAccountId}
                        sx={{
                            minHeight: 40,
                            px: 2,
                            fontWeight: 800,
                            borderRadius: 2,
                            whiteSpace: "nowrap",
                        }}
                    >
                        Add
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
}