// src/app/common/components/platforms/TradingViewConfigModal.tsx
import * as React from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import {alpha} from "@mui/material/styles";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import {PLATFORM_CONFIG, type PlatformKey} from "@/app/old/layout/client/clientNav";
import {getActivePlatformFromStorage} from "@/modules/integrations/metatrader5/trades/utils/getActivePlatform";

// ✅ SOLO necesitamos este endpoint para mostrar webhookKey
import {getUserPlatformWebhookKey} from "@/modules/core/userPlatforms/api/userPlatforms";

type Props = {
    open: boolean;
    onClose: () => void;
    platformKey: PlatformKey | null;
};

function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export default function TradingViewConfigModal({open, onClose, platformKey}: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const config = platformKey ? PLATFORM_CONFIG[platformKey] : undefined;
    const dictionary = config?.tradingViewDictionary;

    // ✅ active platform desde localStorage
    const activePlatform = React.useMemo(() => getActivePlatformFromStorage(), []);
    const linkId = activePlatform?.linkId ?? null;

    const hasDictionary = Boolean(dictionary?.url && dictionary?.json);

    // ✅ URL del webhook (ya viene desde env en el dictionary)
    const webhookUrl = React.useMemo(() => dictionary?.url ?? "", [dictionary?.url]);

    // ✅ webhookKey viene del backend
    const [webhookKey, setWebhookKey] = React.useState<string | null>(null);

    // Cargar webhookKey al abrir el modal
    React.useEffect(() => {
        if (!open) return;
        if (!linkId) return;
        if (!hasDictionary) return;

        let mounted = true;

        (async () => {
            try {
                const res = await getUserPlatformWebhookKey(linkId); // { webhookKey }
                if (!mounted) return;
                setWebhookKey(res.webhookKey);
            } catch {
                // opcional: console.error(e)
                if (!mounted) return;
                setWebhookKey(null);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [open, linkId, hasDictionary]);

    // ✅ JSON final: reemplaza tokens (<linkId>, <WEBHOOK_KEY>)
    const jsonString = React.useMemo(() => {
        if (!dictionary?.json) return "";

        try {
            const payload: any = deepClone(dictionary.json);

            const replaceToken = (v: any) => {
                if (typeof v !== "string") return v;

                if (v === "<linkId>" || v === "<USER_PLATFORM_ID>") return linkId ?? v;
                if (v === "<WEBHOOK_KEY>") return webhookKey ?? v;

                return v;
            };

            // reemplazo en primer nivel (tu estructura)
            Object.keys(payload).forEach((k) => {
                payload[k] = replaceToken(payload[k]);
            });

            return JSON.stringify(payload, null, 2);
        } catch {
            return "";
        }
    }, [dictionary?.json, linkId, webhookKey]);

    const handleCopyUrl = React.useCallback(() => {
        if (!webhookUrl) return;
        void navigator.clipboard?.writeText(webhookUrl);
    }, [webhookUrl]);

    const handleCopyJson = React.useCallback(() => {
        if (!jsonString) return;
        void navigator.clipboard?.writeText(jsonString);
    }, [jsonString]);

    const title =
        config && platformKey ? `TradingView config · ${config.name.toUpperCase()}` : "TradingView config";

    const codeBlockSx = {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 13,
        borderRadius: 2,
        px: 1.5,
        py: 1.5,
        maxHeight: 320,
        overflow: "auto",
        whiteSpace: "pre" as const,
        bgcolor: isDark ? alpha(theme.palette.grey[900], 0.7) : theme.palette.grey[100],
        color: isDark ? theme.palette.grey[100] : theme.palette.text.primary,
        border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.7 : 0.9)}`,
    };

    const inlineValueSx = {
        ...codeBlockSx,
        py: 1,
        whiteSpace: "normal" as const,
        wordBreak: "break-all" as const,
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            aria-labelledby="tradingview-config-dialog-title"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: "background.paper",
                    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                    boxShadow: isDark ? 24 : 8,
                },
            }}
        >
            <DialogTitle
                id="tradingview-config-dialog-title"
                sx={{display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1}}
            >
                <Typography variant="h6" fontWeight={700}>
                    {title}
                </Typography>

                <IconButton size="small" onClick={onClose}>
                    <CloseRoundedIcon fontSize="small"/>
                </IconButton>
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    pt: 2.5,
                    bgcolor: isDark ? "background.default" : "background.paper",
                }}
            >
                {!hasDictionary && (
                    <Typography variant="body2" color="text.secondary">
                        This platform does not have a TradingView dictionary configured yet.
                    </Typography>
                )}

                {hasDictionary && (
                    <Stack spacing={3}>
                        {/* URL */}
                        <Box>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}
                                   mb={1}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Webhook URL
                                </Typography>

                                <Tooltip title="Copy URL">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<ContentCopyRoundedIcon fontSize="small"/>}
                                        onClick={handleCopyUrl}
                                        disabled={!webhookUrl}
                                        sx={{textTransform: "none"}}
                                    >
                                        Copy URL
                                    </Button>
                                </Tooltip>
                            </Stack>

                            <Box sx={inlineValueSx}>{webhookUrl || "—"}</Box>

                            <Typography variant="caption" color="text.secondary" sx={{mt: 0.75, display: "block"}}>
                                Paste this URL into the <b>Webhook URL</b> field in your TradingView alert.
                            </Typography>
                        </Box>

                        <Divider/>

                        {/* JSON */}
                        <Box>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}
                                   mb={1}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    JSON payload
                                </Typography>

                                <Tooltip title="Copy JSON body">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<ContentCopyRoundedIcon fontSize="small"/>}
                                        onClick={handleCopyJson}
                                        disabled={!jsonString}
                                        sx={{textTransform: "none"}}
                                    >
                                        Copy JSON
                                    </Button>
                                </Tooltip>
                            </Stack>

                            <Box sx={codeBlockSx}>{jsonString || "—"}</Box>

                            <Typography variant="caption" color="text.secondary" sx={{mt: 0.75, display: "block"}}>
                                Paste this JSON into the <b>Message</b> field in your TradingView alert.
                                <br/>
                                TradingView will automatically
                                replace <b>{"{{strategy.order.action}}"}</b> and <b>{"{{ticker}}"}</b>.
                            </Typography>

                            {!linkId && (
                                <Typography variant="caption" sx={{mt: 1, display: "block", color: "warning.main"}}>
                                    ⚠ No active platform selected. We need a <b>userPlatformId</b> to build the correct
                                    payload.
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{px: 3, py: 1.5}}>
                <Button onClick={onClose} color="inherit" sx={{textTransform: "none"}}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}