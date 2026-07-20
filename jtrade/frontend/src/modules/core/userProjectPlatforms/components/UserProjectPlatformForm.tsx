import * as React from "react";

import {
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Stack,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";

import type { ProjectCodePlatform } from "@/modules/core/projectCodePlatforms/types/projectCodePlatforms";
import type { CreateUserProjectPlatformDto } from "../types/userProjectPlatforms";

type Props = {
    loading?: boolean;
    projectPlatforms?: ProjectCodePlatform[];
    subscribedProjectCodePlatformIds?: string[];
    onSubmit: (dto: CreateUserProjectPlatformDto) => void | Promise<void>;
    onCancel?: () => void;
};

type PlatformTab = {
    id: string;
    name: string;
    imageUrl?: string;
};

function getProjectName(item: any): string {
    return item.codeProject?.name || "Project";
}

function getProjectDescription(item: any): string {
    return item.codeProject?.description || "No description available.";
}

function getProjectKey(item: any): string {
    return item.codeProject?.projectKey || "";
}

function getPlatformName(item: any): string {
    return item.platform?.name || "Platform";
}

function getProviderName(item: any): string {
    return (
        item.companyProvider?.companyName ??
        item.codeProject?.companyProvider?.companyName ??
        item.codeProject?.companyProviderId?.companyName ??
        "Provider"
    );
}

function getTypeProjectName(item: any): string {
    return (
        item.codeProject?.typeProject?.name ??
        item.codeProject?.typeProjectId?.name ??
        "Project"
    );
}

function getTypeProjectKey(item: any): string {
    return (
        item.codeProject?.typeProject?.key ??
        item.codeProject?.typeProjectId?.key ??
        ""
    );
}

function buildPlatformTabs(items: ProjectCodePlatform[]): PlatformTab[] {
    const map = new Map<string, PlatformTab>();

    for (const item of items) {
        const platform = item.platform;
        if (!platform?.id) continue;

        if (!map.has(platform.id)) {
            map.set(platform.id, {
                id: platform.id,
                name: platform.name,
                imageUrl: platform.imageUrl,
            });
        }
    }

    return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );
}

export default function UserProjectPlatformForm({
                                                    loading,
                                                    projectPlatforms = [],
                                                    subscribedProjectCodePlatformIds = [],
                                                    onSubmit,
                                                    onCancel,
                                                }: Props) {
    const [platformFilter, setPlatformFilter] = React.useState("all");
    const [selectedProjectCodePlatformId, setSelectedProjectCodePlatformId] =
        React.useState("");

    const subscribedSet = React.useMemo(() => {
        return new Set(subscribedProjectCodePlatformIds.map(String));
    }, [subscribedProjectCodePlatformIds]);

    const availableProjectPlatforms = React.useMemo(() => {
        return projectPlatforms.filter((item) => {
            return item.isActive === true && item.status === "published";
        });
    }, [projectPlatforms]);

    const platformTabs = React.useMemo(() => {
        return buildPlatformTabs(availableProjectPlatforms);
    }, [availableProjectPlatforms]);

    const visibleProjects = React.useMemo(() => {
        if (platformFilter === "all") return availableProjectPlatforms;

        return availableProjectPlatforms.filter(
            (item) => item.platform?.id === platformFilter,
        );
    }, [availableProjectPlatforms, platformFilter]);

    const selectedProject = React.useMemo(() => {
        return (
            availableProjectPlatforms.find(
                (item) => item.id === selectedProjectCodePlatformId,
            ) ?? null
        );
    }, [availableProjectPlatforms, selectedProjectCodePlatformId]);

    const selectedAlreadySubscribed = selectedProject
        ? subscribedSet.has(String(selectedProject.id))
        : false;

    const canSubmit =
        !!selectedProjectCodePlatformId &&
        !selectedAlreadySubscribed &&
        !loading;

    const handleSubscribe = async () => {
        if (!canSubmit) return;

        await onSubmit({
            projectCodePlatformId: selectedProjectCodePlatformId,
        });

        setSelectedProjectCodePlatformId("");
    };

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 4,
                p: { xs: 1.5, sm: 2.5 },
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900}>
                        Project Marketplace
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Browse available projects by platform and subscribe to access downloads.
                    </Typography>
                </Box>

                <Divider />

                <Box sx={{ maxWidth: "100%", overflowX: "auto", pb: 0.5 }}>
                    <Tabs
                        value={platformFilter}
                        onChange={(_, next) => {
                            setPlatformFilter(next);
                            setSelectedProjectCodePlatformId("");
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        <Tab
                            value="all"
                            label={`All (${availableProjectPlatforms.length})`}
                            sx={{
                                textTransform: "none",
                                fontWeight: 900,
                            }}
                        />

                        {platformTabs.map((platform) => {
                            const count = availableProjectPlatforms.filter(
                                (item) => item.platform?.id === platform.id,
                            ).length;

                            return (
                                <Tab
                                    key={platform.id}
                                    value={platform.id}
                                    label={`${platform.name} (${count})`}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 900,
                                    }}
                                />
                            );
                        })}
                    </Tabs>
                </Box>

                {visibleProjects.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            p: 2,
                            border: "1px dashed",
                            borderColor: "divider",
                            textAlign: "center",
                            bgcolor: "background.default",
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            No projects available for this platform.
                        </Typography>
                    </Paper>
                ) : (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, minmax(0, 1fr))",
                                lg: "repeat(3, minmax(0, 1fr))",
                            },
                            gap: 1.5,
                        }}
                    >
                        {visibleProjects.map((item: any) => {
                            const selected =
                                selectedProjectCodePlatformId === item.id;

                            const alreadySubscribed = subscribedSet.has(
                                String(item.id),
                            );

                            return (
                                <Paper
                                    key={item.id}
                                    elevation={0}
                                    onClick={() => {
                                        if (alreadySubscribed) return;
                                        setSelectedProjectCodePlatformId(item.id);
                                    }}
                                    sx={{
                                        cursor: alreadySubscribed
                                            ? "default"
                                            : "pointer",
                                        borderRadius: 3,
                                        p: 1.6,
                                        border: "1px solid",
                                        borderColor: selected
                                            ? "primary.main"
                                            : "divider",
                                        bgcolor: selected
                                            ? "action.selected"
                                            : "background.default",
                                        opacity: alreadySubscribed ? 0.72 : 1,
                                        transition:
                                            "border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease",
                                        "&:hover": alreadySubscribed
                                            ? {}
                                            : {
                                                borderColor: "primary.main",
                                                transform: "translateY(-1px)",
                                            },
                                    }}
                                >
                                    <Stack spacing={1.4}>
                                        <Stack
                                            direction="row"
                                            spacing={1.25}
                                            alignItems="center"
                                        >
                                            <Avatar
                                                src={
                                                    item.platform?.imageUrl ||
                                                    undefined
                                                }
                                                alt={getPlatformName(item)}
                                                sx={{
                                                    width: 44,
                                                    height: 44,
                                                    bgcolor: "background.paper",
                                                    border: "1px solid",
                                                    borderColor: "divider",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {getPlatformName(item)
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </Avatar>

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography
                                                    variant="body1"
                                                    fontWeight={900}
                                                    noWrap
                                                >
                                                    {getProjectName(item)}
                                                </Typography>

                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    noWrap
                                                >
                                                    by {getProviderName(item)}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                                minHeight: 40,
                                            }}
                                        >
                                            {getProjectDescription(item)}
                                        </Typography>

                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            flexWrap="wrap"
                                            useFlexGap
                                        >
                                            <Chip
                                                size="small"
                                                label={getPlatformName(item)}
                                                variant="outlined"
                                            />

                                            <Chip
                                                size="small"
                                                label={
                                                    getTypeProjectName(item) ||
                                                    getTypeProjectKey(item)
                                                }
                                                variant="outlined"
                                            />

                                            <Chip
                                                size="small"
                                                label={item.deliveryMode}
                                                variant="outlined"
                                            />

                                            <Chip
                                                size="small"
                                                label={item.runtimeMode}
                                                variant="outlined"
                                            />

                                            <Chip
                                                size="small"
                                                label={
                                                    alreadySubscribed
                                                        ? "subscribed"
                                                        : item.status
                                                }
                                                color={
                                                    alreadySubscribed
                                                        ? "success"
                                                        : item.status ===
                                                        "published"
                                                            ? "success"
                                                            : "default"
                                                }
                                                variant="outlined"
                                            />
                                        </Stack>

                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            spacing={1}
                                        >
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                noWrap
                                            >
                                                {getProjectKey(item)}
                                            </Typography>

                                            <Button
                                                variant={
                                                    selected
                                                        ? "contained"
                                                        : "outlined"
                                                }
                                                size="small"
                                                disabled={
                                                    loading ||
                                                    alreadySubscribed
                                                }
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelectedProjectCodePlatformId(
                                                        item.id,
                                                    );
                                                }}
                                                sx={{
                                                    textTransform: "none",
                                                    fontWeight: 900,
                                                    borderRadius: 999,
                                                }}
                                            >
                                                {alreadySubscribed
                                                    ? "Subscribed"
                                                    : selected
                                                        ? "Selected"
                                                        : "Select"}
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Box>
                )}

                <Divider />

                <Stack
                    direction="row"
                    justifyContent={{ xs: "stretch", sm: "space-between" }}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    spacing={1.5}
                    flexWrap="wrap"
                    useFlexGap
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" color="text.secondary">
                            Selected project
                        </Typography>

                        <Typography variant="body2" fontWeight={900} noWrap>
                            {selectedProject
                                ? `${getProjectName(
                                    selectedProject,
                                )} / by ${getProviderName(selectedProject)}`
                                : "No project selected"}
                        </Typography>
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1.5}
                        justifyContent={{ xs: "stretch", sm: "flex-end" }}
                        flexWrap="wrap"
                        useFlexGap
                    >
                        {onCancel && (
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={onCancel}
                                disabled={loading}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 800,
                                    minWidth: 120,
                                    borderRadius: 999,
                                }}
                            >
                                Cancel
                            </Button>
                        )}

                        <Button
                            variant="contained"
                            onClick={handleSubscribe}
                            disabled={!canSubmit}
                            sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                minWidth: 140,
                                borderRadius: 999,
                            }}
                        >
                            {loading ? "Saving..." : "Subscribe"}
                        </Button>
                    </Stack>
                </Stack>
            </Stack>
        </Paper>
    );
}