import * as React from "react";

import {
    Avatar,
    Box,
    Button,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import type { UserProjectPlatformOption } from "../types/userAccountInfo";

type Props = {
    userProjectPlatformOptions?: UserProjectPlatformOption[];
    userProjectPlatformId: string;
    onUserProjectPlatformChange: (id: string) => void;

    isCreating: boolean;
    isEditing: boolean;

    onClickAdd: () => void;
    onCancel: () => void;

    disabled?: boolean;
};

export default function MyAccountInfoHeader({
                                                userProjectPlatformOptions = [],
                                                userProjectPlatformId,
                                                onUserProjectPlatformChange,
                                                isCreating,
                                                isEditing,
                                                onClickAdd,
                                                onCancel,
                                                disabled,
                                            }: Props) {
    const showCancel = isCreating || isEditing;

    return (
        <Box sx={{ mb: 2.5, flexShrink: 0 }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
            >
                <TextField
                    select
                    fullWidth
                    label="Project"
                    value={userProjectPlatformId}
                    onChange={(e) =>
                        onUserProjectPlatformChange(String(e.target.value))
                    }
                    InputLabelProps={{ shrink: true }}
                    helperText="Select a project to manage account information."
                    disabled={disabled}
                    sx={{
                        maxWidth: { xs: "100%", sm: 520 },
                    }}
                >
                    {userProjectPlatformOptions.length === 0 ? (
                        <MenuItem value="" disabled>
                            No projects available
                        </MenuItem>
                    ) : (
                        userProjectPlatformOptions.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                <Stack
                                    direction="row"
                                    spacing={1.2}
                                    alignItems="center"
                                    sx={{ minWidth: 0 }}
                                >
                                    <Avatar
                                        src={option.imageUrl || undefined}
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            flexShrink: 0,
                                        }}
                                    />

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            fontWeight={900}
                                            noWrap
                                        >
                                            {option.label}
                                        </Typography>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                        >

                                        </Typography>
                                    </Box>
                                </Stack>
                            </MenuItem>
                        ))
                    )}
                </TextField>

                <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
                    {showCancel ? (
                        <Button
                            fullWidth
                            startIcon={<CloseRoundedIcon />}
                            onClick={onCancel}
                            disabled={disabled}
                            variant="outlined"
                            color="inherit"
                            sx={{
                                height: 44,
                                borderRadius: 999,
                                textTransform: "none",
                                fontWeight: 900,
                                px: 2.5,
                            }}
                        >
                            Cancel
                        </Button>
                    ) : (
                        <Button
                            fullWidth
                            startIcon={<AddRoundedIcon />}
                            onClick={onClickAdd}
                            disabled={!userProjectPlatformId || disabled}
                            variant="contained"
                            sx={{
                                height: 44,
                                borderRadius: 999,
                                textTransform: "none",
                                fontWeight: 900,
                                px: 2.5,
                            }}
                        >
                            Add account
                        </Button>
                    )}
                </Box>
            </Stack>
        </Box>
    );
}