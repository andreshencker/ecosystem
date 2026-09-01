import * as React from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

type Props = {
    open: boolean;
    url: string | null;
    email?: string;
    onClose: () => void;
};

/**
 * Grapifly only hands back the raw invite token once — at create / regenerate
 * time — so we surface it here for the admin to copy. Listing invitations never
 * returns a usable link (by design); "Regenerate" is the way to get a fresh one.
 */
export default function InviteLinkDialog({ open, url, email, onClose }: Props) {
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        if (!open) setCopied(false);
    }, [open]);

    const handleCopy = async () => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable — user can still select the text manually */
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Invitation link</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {email ? (
                        <>Share this link with <strong>{email}</strong>. </>
                    ) : null}
                    It expires in 7 days and can only be used once. You won't be able to see it again after closing this dialog.
                </Typography>
                <TextField
                    value={url ?? ""}
                    fullWidth
                    size="small"
                    InputProps={{
                        readOnly: true,
                        endAdornment: (
                            <InputAdornment position="end">
                                <Tooltip title={copied ? "Copied" : "Copy"}>
                                    <IconButton edge="end" onClick={handleCopy} size="small">
                                        {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                            </InputAdornment>
                        ),
                    }}
                    onFocus={(e) => e.target.select()}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button variant="outlined" onClick={onClose}>Close</Button>
                <Box>
                    <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopy} disabled={!url}>
                        {copied ? "Copied" : "Copy link"}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}
