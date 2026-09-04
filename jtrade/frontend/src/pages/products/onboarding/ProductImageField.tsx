import * as React from "react";
import {
    Box,
    Button,
    Link,
    Paper,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import toast from "react-hot-toast";

import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import { FieldLabelWithHelp } from "@/components/shared/FieldLabelWithHelp";

type Variant = "logo" | "cover";

/** Previews share the SAME HEIGHT so both cards line up row-for-row; only width differs. */
const PREVIEW_H = 150;
const META: Record<Variant, { help: string; recommendation: string; fit: "contain" | "cover"; previewW: number }> = {
    logo: {
        help: "Your product logo is the small visual identity used in cards, lists and product headers.",
        recommendation: "Recommended: square image, e.g. 512 × 512 px.",
        fit: "contain",
        previewW: PREVIEW_H, // square
    },
    cover: {
        help: "The main visual used to present your product on its Marketplace listing.",
        recommendation: "Recommended: wide image, e.g. 1600 × 900 px.",
        fit: "cover",
        previewW: Math.round((PREVIEW_H * 16) / 9), // 16:9 at the same height
    },
};

/**
 * A product image (logo or cover) rendered as a self-contained card: label,
 * centred preview, a "Remove" link when set, an Upload / URL segmented toggle,
 * and the matching input. Upload uses the existing POST /products/:id/media
 * (needs a created product); URL paste always works. Broken URLs degrade to a
 * placeholder, never a broken page.
 */
export function ProductImageField({
    productId,
    kind,
    label,
    url,
    onChange,
}: {
    productId: string | null;
    kind: Variant;
    label: string;
    url: string;
    onChange: (url: string) => void;
}) {
    const meta = META[kind];
    const canUpload = !!productId;

    const [busy, setBusy] = React.useState(false);
    const [broken, setBroken] = React.useState(false);
    const [mode, setMode] = React.useState<"upload" | "url">(url ? "url" : canUpload ? "upload" : "url");

    React.useEffect(() => setBroken(false), [url]);

    const upload = async (file: File) => {
        if (!productId) return;
        setBusy(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await api.post<{ status: string; data: { logoUrl?: string; coverImageUrl?: string } }>(
                `/products/${productId}/media?kind=${kind}`,
                form,
                { headers: { "Content-Type": "multipart/form-data" } },
            );
            const next = kind === "cover" ? res.data.data.coverImageUrl : res.data.data.logoUrl;
            if (next) onChange(next);
            toast.success(`${label} uploaded.`);
        } catch (err) {
            toast.error(errorToMessage(err, "Upload failed — you can paste a URL instead."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
        >
            <FieldLabelWithHelp label={label} help={meta.help} />

            {/* preview — fixed height so the two cards align */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: meta.previewW,
                        height: PREVIEW_H,
                        borderRadius: 1.5,
                        border: 1,
                        borderColor: "divider",
                        bgcolor: "action.hover",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                    }}
                >
                    {url && !broken ? (
                        <Box
                            component="img"
                            src={url}
                            alt=""
                            onError={() => setBroken(true)}
                            sx={{ width: "100%", height: "100%", objectFit: meta.fit }}
                        />
                    ) : (
                        <Stack alignItems="center" spacing={0.5} sx={{ color: "text.disabled", p: 1, textAlign: "center" }}>
                            {broken ? <BrokenImageOutlinedIcon fontSize="small" /> : <ImageOutlinedIcon fontSize="small" />}
                            <Typography variant="caption">
                                {broken ? "Could not load this image" : `No ${label.toLowerCase()} yet`}
                            </Typography>
                        </Stack>
                    )}
                </Box>
            </Box>

            {/* remove */}
            <Box sx={{ textAlign: "center", minHeight: 22, mt: 1 }}>
                {url && (
                    <Link component="button" type="button" underline="hover" color="error" variant="body2" onClick={() => onChange("")}>
                        Remove {label.toLowerCase()}
                    </Link>
                )}
            </Box>

            {/* source toggle */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: 0.5 }}>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={mode}
                    onChange={(_e, v) => v && setMode(v)}
                    sx={{ "& .MuiToggleButton-root": { px: 2, textTransform: "none", fontWeight: 700, borderRadius: 999 } }}
                >
                    <ToggleButton value="upload" disabled={!canUpload}>Upload</ToggleButton>
                    <ToggleButton value="url">URL</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* mode input — fixed slot so switching Upload/URL never shifts the layout */}
            <Box sx={{ mt: 1.5, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {mode === "upload" ? (
                    <Button
                        component="label"
                        size="small"
                        variant="outlined"
                        startIcon={<UploadFileOutlinedIcon />}
                        disabled={busy || !canUpload}
                    >
                        {busy ? "Uploading…" : url ? "Replace image" : "Choose a file"}
                        <input
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.currentTarget.value = ""; }}
                        />
                    </Button>
                ) : (
                    <TextField
                        size="small"
                        placeholder="https://…"
                        value={url}
                        onChange={(e) => onChange(e.target.value)}
                        fullWidth
                    />
                )}
            </Box>

            {mode === "upload" && !canUpload && (
                <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ display: "block", mt: 0.5 }}>
                    Upload becomes available after the product is created.
                </Typography>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: "auto", pt: 1.25, textAlign: "center" }}>
                {meta.recommendation}
            </Typography>
        </Paper>
    );
}
