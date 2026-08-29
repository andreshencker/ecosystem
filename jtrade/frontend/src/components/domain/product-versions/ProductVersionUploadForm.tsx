import * as React from "react";
import {
    Box,
    Button,
    Checkbox,
    Divider,
    FormControlLabel,
    Grid,
    MenuItem,
    Stack,
    TextField,
} from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

import { usePlatforms } from "@/hooks/api/usePlatforms";

export type ProductVersionFormValues = {
    platformId: string;
    version: string;
    releaseNotes: string;
    isCurrentVersion: boolean;
};

type Props = {
    /** When set, only the file/version/notes/current fields are editable — platform is fixed (replace-file mode). */
    fixedPlatformId?: string;
    initialVersion?: string;
    loading?: boolean;
    onSubmit: (values: ProductVersionFormValues, file: File) => void | Promise<void>;
    onCancel?: () => void;
    submitLabel?: string;
};

export default function ProductVersionUploadForm({ fixedPlatformId, initialVersion, loading, onSubmit, onCancel, submitLabel }: Props) {
    const platformsQuery = usePlatforms({ active: true });
    const platforms = platformsQuery.data ?? [];

    const [values, setValues] = React.useState<ProductVersionFormValues>({
        platformId: fixedPlatformId ?? "",
        version: initialVersion ?? "",
        releaseNotes: "",
        isCurrentVersion: !fixedPlatformId,
    });
    const [file, setFile] = React.useState<File | null>(null);

    const handleChange =
        (field: "platformId" | "version" | "releaseNotes") =>
            (e: React.ChangeEvent<HTMLInputElement>) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.platformId || !values.version.trim() || !file) return;
        await onSubmit(values, file);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select label="Platform" value={values.platformId} onChange={handleChange("platformId")}
                            fullWidth required disabled={!!fixedPlatformId} InputLabelProps={{ shrink: true }}
                        >
                            {platforms.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Version" value={values.version} onChange={handleChange("version")} fullWidth required
                            InputLabelProps={{ shrink: true }} helperText="e.g. 1.0.0" />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField label="Release notes" value={values.releaseNotes} onChange={handleChange("releaseNotes")} fullWidth multiline minRows={2}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Button component="label" variant="outlined" fullWidth startIcon={<UploadFileOutlinedIcon />} sx={{ textTransform: "none", fontWeight: 600, py: 1.25 }}>
                            {file ? file.name : "Choose a file…"}
                            <input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                        </Button>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                            control={<Checkbox checked={values.isCurrentVersion} onChange={(e) => setValues((prev) => ({ ...prev, isCurrentVersion: e.target.checked }))} />}
                            label="Set as the current version for this platform"
                        />
                    </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" justifyContent={{ xs: "stretch", sm: "flex-end" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading} sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 100, sm: 120 } }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading || !values.platformId || !values.version.trim() || !file}
                        sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 120, sm: 140 } }}>
                        {loading ? "Uploading…" : submitLabel ?? "Upload version"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
