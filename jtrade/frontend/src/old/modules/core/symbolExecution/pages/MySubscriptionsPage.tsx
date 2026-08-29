import * as React from "react";

import {
    Box,
    CircularProgress,
    Drawer,
    Paper,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import toast from "react-hot-toast";

import AccountSubscriptionSelector from "../components/AccountSubscriptionSelector";
import SymbolExecutionsTable from "../components/SymbolExecutionsTable";
import SymbolExecutionForm from "../components/SymbolExecutionForm";

import {
    useDeleteMySymbolExecution,
    useMySymbolExecutions,
} from "../hooks/useSymbolExecutions";

import { useMyUserAccountInfos } from "@/old/modules/core/userAccountInfo/hooks/useUserAccountInfo";

export default function MySubscriptionsPage() {
    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const HEADER_HEIGHT = 56;

    const {
        data: rows = [],
        isLoading: subsLoading,
        refetch,
    } = useMySymbolExecutions();

    const {
        data: accounts = [],
        isLoading: accountsLoading,
    } = useMyUserAccountInfos();

    const del = useDeleteMySymbolExecution();

    const [selectedProjectPlatformId, setSelectedProjectPlatformId] =
        React.useState<string | null>(null);

    const [selectedAccountId, setSelectedAccountId] =
        React.useState<string | null>(null);

    const [editing, setEditing] = React.useState<any>(null);

    const [openForm, setOpenForm] = React.useState(false);

    const selectedAccount = React.useMemo(() => {
        if (!selectedAccountId) return null;

        return (
            accounts.find(
                (account: any) =>
                    String(account.id) === String(selectedAccountId),
            ) ?? null
        );
    }, [accounts, selectedAccountId]);

    const accountIndicatorProjectId = React.useMemo(() => {
        return String(
            selectedAccount?.indicatorProjectId ??
            selectedAccount?.indicatorProject?.id ??
            "",
        );
    }, [selectedAccount]);

    const filteredRows = React.useMemo(() => {
        if (!selectedAccountId) return [];

        return (rows ?? []).filter((row: any) => {
            return String(row.userAccountInfoId) === String(selectedAccountId);
        });
    }, [rows, selectedAccountId]);

    const handleProjectChange = (projectPlatformId: string | null) => {
        setSelectedProjectPlatformId(projectPlatformId);
        setSelectedAccountId(null);
        setEditing(null);
        setOpenForm(false);
    };

    const handleAccountChange = (accountId: string | null) => {
        setSelectedAccountId(accountId);
        setEditing(null);
        setOpenForm(false);
    };

    const handleAdd = () => {
        if (!selectedProjectPlatformId) {
            toast.error("Select a project first.");
            return;
        }

        if (!selectedAccountId) {
            toast.error("Select an account first.");
            return;
        }

        if (!accountIndicatorProjectId) {
            toast.error("Selected account does not have an indicator project.");
            return;
        }

        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: any) => {
        if (!selectedAccountId) {
            toast.error("Select an account first.");
            return;
        }

        setEditing(row);
        setOpenForm(true);
    };

    const handleDelete = async (row: any) => {
        await del.mutateAsync(row.id);
        await refetch();
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    if (subsLoading || accountsLoading) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100%",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
                overflowX: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                        My Subscriptions
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage your subscriptions by project and account.
                    </Typography>
                </Box>

                <AccountSubscriptionSelector
                    selectedProjectPlatformId={selectedProjectPlatformId}
                    selectedAccountId={selectedAccountId}
                    onSelectProjectPlatform={handleProjectChange}
                    onSelectAccount={handleAccountChange}
                    onAdd={handleAdd}
                />

                <SymbolExecutionsTable
                    rows={filteredRows}
                    loading={del.isPending}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

                {!selectedAccountId && (
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            p: 2,
                            border: "1px dashed",
                            borderColor: "divider",
                            textAlign: "center",
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Select a project and account to manage
                            subscriptions.
                        </Typography>
                    </Paper>
                )}
            </Stack>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleCloseForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 640, lg: 720 },
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    },
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        p: { xs: 1.5, sm: 2, md: 2.5 },
                    }}
                >
                    <SymbolExecutionForm
                        mode={editing ? "edit" : "create"}
                        userAccountInfoId={selectedAccountId ?? ""}
                        accountIndicatorProjectId={accountIndicatorProjectId}
                        initial={editing}
                        onSuccess={async () => {
                            await refetch();
                            handleCloseForm();
                        }}
                        onCancel={handleCloseForm}
                    />
                </Box>
            </Drawer>
        </Box>
    );
}