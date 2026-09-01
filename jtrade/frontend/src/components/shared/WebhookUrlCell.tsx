import * as React from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

/** Compact webhook URL + copy button, for use inside a DataTable cell or mobile card. */
export default function WebhookUrlCell({ url }: { url: string }) {
    const [copied, setCopied] = React.useState(false);

    const copy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable */
        }
    };

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, width: "100%" }}>
            <Typography
                variant="caption"
                fontFamily="monospace"
                noWrap
                title={url}
                sx={{ flex: 1, minWidth: 0, color: "text.secondary" }}
            >
                {url}
            </Typography>
            <Tooltip title={copied ? "Copied" : "Copy webhook URL"}>
                <IconButton size="small" onClick={copy} sx={{ flexShrink: 0 }}>
                    {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
            </Tooltip>
        </Box>
    );
}
