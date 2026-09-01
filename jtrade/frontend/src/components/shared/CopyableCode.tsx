import * as React from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

/** A short monospace value (key, id, token) with a copy button. */
export default function CopyableCode({
    value,
    label,
    placeholder = "—",
    full = false,
}: {
    value?: string | null;
    label?: string;
    placeholder?: string;
    /** Show the whole value instead of a middle-truncated preview. */
    full?: boolean;
}) {
    const [copied, setCopied] = React.useState(false);

    if (!value) {
        return (
            <Typography variant="caption" color="text.disabled" fontFamily="monospace">
                {placeholder}
            </Typography>
        );
    }

    const copy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    };

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, minWidth: 0 }}>
            <Typography
                variant="caption"
                fontFamily="monospace"
                noWrap={!full}
                title={value}
                sx={{
                    minWidth: 0,
                    maxWidth: full ? "none" : 120,
                    color: "text.secondary",
                    wordBreak: full ? "break-all" : "normal",
                }}
            >
                {full || value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`}
            </Typography>
            <Tooltip title={copied ? "Copied" : label ? `Copy ${label}` : "Copy"}>
                <IconButton size="small" onClick={copy} sx={{ flexShrink: 0 }}>
                    {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                </IconButton>
            </Tooltip>
        </Box>
    );
}
