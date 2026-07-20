import * as React from "react";

import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import toast from "react-hot-toast";

import MyAccountInfoHeader from "../components/MyAccountInfoHeader";
import UserAccountInfoForm from "../components/UserAccountInfoForm";
import UserAccountInfoTable from "../components/UserAccountInfoTable";

import {
    useCreateMyUserAccountInfo,
    useDeleteMyUserAccountInfo,
    useIndicatorProjectOptions,
    useMyUserAccountInfos,
    useUpdateMyUserAccountInfo,
    useUserProjectPlatformOptions,
} from "../hooks/useUserAccountInfo";

import type { UserAccountInfo } from "../types/userAccountInfo";

export default function MyAccountInfoPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const {
        data: allRows = [],
        isLoading: rowsLoading,
        isFetching,
        refetch,
    } = useMyUserAccountInfos();

    const {
        data: userProjectPlatformOptions = [],
        isLoading: userProjectPlatformsLoading,
    } = useUserProjectPlatformOptions();

    const {
        data: indicatorProjectOptions = [],
        isLoading: indicatorProjectsLoading,
    } = useIndicatorProjectOptions();

    const create = useCreateMyUserAccountInfo();
    const update = useUpdateMyUserAccountInfo();
    const remove = useDeleteMyUserAccountInfo();

    const [openForm, setOpenForm] = React.useState(false);
    const [editing, setEditing] = React.useState<UserAccountInfo | null>(null);
    const [userProjectPlatformId, setUserProjectPlatformId] = React.useState("");

    React.useEffect(() => {
        if (userProjectPlatformId) return;
        if (!userProjectPlatformOptions.length) return;

        setUserProjectPlatformId(userProjectPlatformOptions[0].id);
    }, [userProjectPlatformId, userProjectPlatformOptions]);

    const selectedUserProjectPlatform = React.useMemo(() => {
        return (
            userProjectPlatformOptions.find(
                (item) => String(item.id) === String(userProjectPlatformId),
            ) ?? null
        );
    }, [userProjectPlatformId, userProjectPlatformOptions]);

    const isIndicatorProjectType = React.useMemo(() => {
        const typeKey = String(
            selectedUserProjectPlatform?.meta?.typeProjectKey ?? "",
        )
            .toLowerCase()
            .trim();

        const typeName = String(
            selectedUserProjectPlatform?.meta?.typeProjectName ?? "",
        )
            .toLowerCase()
            .trim();

        return typeKey === "indicator" || typeName === "indicator";
    }, [selectedUserProjectPlatform]);

    const filteredIndicatorProjectOptions = React.useMemo(() => {
        if (!selectedUserProjectPlatform) return [];

        const selectedProjectKey =
            selectedUserProjectPlatform.meta?.projectKey;

        const selectedProjectName =
            selectedUserProjectPlatform.meta?.projectName;

        const selectedPlatformName =
            selectedUserProjectPlatform.meta?.platformName;

        return indicatorProjectOptions.filter((item) => {
            const sameProjectByKey =
                selectedProjectKey &&
                item.meta?.projectKey === selectedProjectKey;

            const sameProjectByName =
                item.meta?.projectName === selectedProjectName;

            const samePlatform =
                item.meta?.platformName === selectedPlatformName;

            return (sameProjectByKey || sameProjectByName) && samePlatform;
        });
    }, [indicatorProjectOptions, selectedUserProjectPlatform]);

    const rows = React.useMemo(() => {
        if (!userProjectPlatformId) return [];

        return allRows.filter((row) => {
            return (
                String(row.userProjectPlatformId) ===
                String(userProjectPlatformId)
            );
        });
    }, [allRows, userProjectPlatformId]);

    const loading =
        rowsLoading ||
        userProjectPlatformsLoading ||
        indicatorProjectsLoading;

    const pending =
        create.isPending ||
        update.isPending ||
        remove.isPending;

    const handleAdd = () => {
        if (!userProjectPlatformId) {
            toast.error("Select a project first.");
            return;
        }

        if (
            isIndicatorProjectType &&
            filteredIndicatorProjectOptions.length === 0
        ) {
            toast.error(
                "No indicator projects available for this project platform.",
            );
            return;
        }

        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: UserAccountInfo) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleDelete = async (row: UserAccountInfo) => {
        await remove.mutateAsync(row.id);
        await refetch();

        if (editing?.id === row.id) {
            handleCloseForm();
        }
    };

    if (loading) {
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
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
            }}
        >
            <Box sx={{ mb: 2.5, flexShrink: 0 }}>
                <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                    Account Info
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Manage trading account configurations by project platform.
                </Typography>
            </Box>

            <MyAccountInfoHeader
                userProjectPlatformOptions={userProjectPlatformOptions}
                userProjectPlatformId={userProjectPlatformId}
                onUserProjectPlatformChange={(id) => {
                    setUserProjectPlatformId(id);
                    handleCloseForm();
                }}
                isCreating={!editing && openForm}
                isEditing={!!editing && openForm}
                onClickAdd={handleAdd}
                onCancel={handleCloseForm}
                disabled={pending || isFetching}
            />

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <UserAccountInfoTable
                    rows={rows}
                    loading={pending || isFetching}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleCloseForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : 620,
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile ? "70vh" : undefined,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        p: 2.5,
                        overflowY: "auto",
                        overflowX: "hidden",
                        bgcolor: "background.paper",
                    },
                }}
            >
                <UserAccountInfoForm
                    mode={editing ? "edit" : "create"}
                    initial={editing}
                    userProjectPlatformId={userProjectPlatformId}
                    indicatorProjectOptions={filteredIndicatorProjectOptions}
                    showIndicatorProjectSelect={isIndicatorProjectType}
                    loading={create.isPending || update.isPending}
                    onCreate={async (dto) => {
                        await create.mutateAsync(dto);
                        await refetch();
                        handleCloseForm();
                    }}
                    onUpdate={async (id, dto) => {
                        await update.mutateAsync({ id, dto });
                        await refetch();
                        handleCloseForm();
                    }}
                    onCancel={handleCloseForm}
                />
            </Drawer>
        </Box>
    );
}