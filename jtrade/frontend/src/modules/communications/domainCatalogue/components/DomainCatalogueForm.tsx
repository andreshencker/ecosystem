import * as React from "react";
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    Grid,
    ListItemText,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import type {
    CreateDomainCatalogueDto,
    DomainCatalogue,
    DomainChannel,
    UpdateDomainCatalogueDto,
} from "../types/domainCatalogue.types";

import type { ProviderCredentialOption } from "@/modules/communications/providerCredentials/types/providerCredentials.types";

type Mode = "create" | "edit" | "view";

type Props = {
    initial?: DomainCatalogue | null;
    companyId: string;
    loading?: boolean;
    mode?: Mode;

    credentialOptions?: ProviderCredentialOption[];
    credentialsLoading?: boolean;

    onSubmit: (
        values: CreateDomainCatalogueDto | UpdateDomainCatalogueDto
    ) => void | Promise<void>;
    onCancel?: () => void;
};

type FormValues = {
    domainKey: string;
    displayName: string;
    domainCategory: string;
    isActive: boolean;
    selectedCredentialIds: string[];
};

const EMPTY_VALUES: FormValues = {
    domainKey: "",
    displayName: "",
    domainCategory: "",
    isActive: true,
    selectedCredentialIds: [],
};

function buildInitialValues(initial?: DomainCatalogue | null): FormValues {
    if (!initial) return EMPTY_VALUES;

    return {
        domainKey: initial.domainKey ?? "",
        displayName: initial.displayName ?? "",
        domainCategory: initial.domainCategory ?? "",
        isActive: initial.isActive ?? true,
        selectedCredentialIds:
            initial.channelsToUse?.map((x) => x.providerCredentialsId) ?? [],
    };
}

function buildChannels(
    selectedCredentialIds: string[],
    credentialOptions: ProviderCredentialOption[]
) {
    const channels: Array<{
        channel: DomainChannel;
        providerCredentialsId: string;
    }> = [];

    selectedCredentialIds.forEach((id) => {
        const option = credentialOptions.find((x) => x.id === id);

        if (!option?.channel) return;

        channels.push({
            channel: option.channel as DomainChannel,
            providerCredentialsId: option.id,
        });
    });

    return channels;
}

export default function DomainCatalogueForm({
                                                initial,
                                                companyId,
                                                loading = false,
                                                mode = "create",
                                                credentialOptions = [],
                                                credentialsLoading = false,
                                                onSubmit,
                                                onCancel,
                                            }: Props) {
    const isView = mode === "view";
    const isEdit = mode === "edit";

    const [values, setValues] = React.useState<FormValues>(() =>
        buildInitialValues(initial)
    );

    React.useEffect(() => {
        setValues(buildInitialValues(initial));
    }, [initial, mode]);

    const handleTextChange =
        (field: keyof Pick<FormValues, "domainKey" | "displayName" | "domainCategory">) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                setValues((prev) => ({
                    ...prev,
                    [field]: event.target.value,
                }));
            };

    const handleCredentialsChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = event.target.value;

        setValues((prev) => ({
            ...prev,
            selectedCredentialIds:
                typeof value === "string" ? value.split(",") : (value as any),
        }));
    };

    const handleSwitchChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setValues((prev) => ({
            ...prev,
            isActive: event.target.checked,
        }));
    };

    const getOptionLabel = (id: string) => {
        const option = credentialOptions.find((x) => x.id === id);
        return option?.label ?? id;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isView) return;

        const payload: CreateDomainCatalogueDto | UpdateDomainCatalogueDto = {
            companyId,
            domainKey: values.domainKey.trim().toLowerCase(),
            displayName: values.displayName.trim(),
            domainCategory: values.domainCategory.trim().toLowerCase(),
            isActive: !!values.isActive,
            channelsToUse: buildChannels(
                values.selectedCredentialIds,
                credentialOptions
            ),
        };

        await onSubmit(payload);
    };

    const submitDisabled =
        loading ||
        credentialsLoading ||
        !values.domainKey.trim() ||
        !values.displayName.trim() ||
        !values.domainCategory.trim();

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 1.5, sm: 2, md: 2.5 },
                bgcolor: "background.paper",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {mode === "create"
                            ? "Create domain"
                            : mode === "edit"
                                ? "Edit domain"
                                : "Domain details"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage communication domains and provider credentials.
                    </Typography>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                        Domain information
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Domain key"
                                value={values.domainKey}
                                onChange={handleTextChange("domainKey")}
                                fullWidth
                                disabled={isView || isEdit}
                                placeholder="auth"
                                InputLabelProps={{ shrink: true }}
                                helperText={
                                    isEdit
                                        ? "Domain key cannot be changed after creation."
                                        : "Unique key, for example: auth, billing, reports."
                                }
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Display name"
                                value={values.displayName}
                                onChange={handleTextChange("displayName")}
                                fullWidth
                                disabled={isView}
                                placeholder="Authentication"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Domain category"
                                value={values.domainCategory}
                                onChange={handleTextChange("domainCategory")}
                                fullWidth
                                disabled={isView}
                                placeholder="system"
                                InputLabelProps={{ shrink: true }}
                                helperText="Example: system, trading, billing, reports."
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                        Channels to use
                    </Typography>

                    <TextField
                        select
                        SelectProps={{
                            multiple: true,
                            renderValue: (selected) => (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {(selected as string[]).map((id) => (
                                        <Chip
                                            key={id}
                                            label={getOptionLabel(id)}
                                            size="small"
                                        />
                                    ))}
                                </Stack>
                            ),
                        }}
                        label="Provider credentials"
                        value={values.selectedCredentialIds}
                        onChange={handleCredentialsChange}
                        fullWidth
                        disabled={isView || credentialsLoading}
                        InputLabelProps={{ shrink: true }}
                        helperText={
                            credentialOptions.length === 0
                                ? "No active provider credentials available."
                                : "Select one or more credentials for this domain."
                        }
                    >
                        {credentialOptions.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                <Checkbox
                                    checked={values.selectedCredentialIds.includes(option.id)}
                                />
                                <ListItemText primary={option.label} />
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>

                <Divider />

                <FormControlLabel
                    control={
                        <Switch
                            checked={!!values.isActive}
                            onChange={handleSwitchChange}
                            disabled={isView}
                        />
                    }
                    label="Active"
                />

                <Divider />

                <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                    <Button
                        type="button"
                        variant="outlined"
                        color="inherit"
                        onClick={onCancel}
                        disabled={loading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: 130,
                        }}
                    >
                        {isView ? "Close" : "Cancel"}
                    </Button>

                    {!isView && (
                        <Button
                            type="submit"
                            variant="contained"
                            color="warning"
                            disabled={submitDisabled}
                            sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                color: "#fff",
                                borderRadius: 3,
                                minWidth: 150,
                            }}
                        >
                            {isEdit ? "Save changes" : "Create domain"}
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
}