import * as React from "react";
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

type ChartKind = "pie" | "donut" | "bars" | "line" | "area" | "hbars";

type ChartCardModel = {
    id: string;
    title: string;
    subtitle: string;
    kind: ChartKind;
};

const CHARTS: ChartCardModel[] = [
    {id: "pnl_by_symbol", title: "PnL by Symbol", subtitle: "Distribution (dummy)", kind: "pie"},
    {id: "wins_vs_losses", title: "Wins vs Losses", subtitle: "Ratio (dummy)", kind: "donut"},
    {id: "trades_by_hour", title: "Trades by Hour", subtitle: "Volume (dummy)", kind: "bars"},
    {id: "equity_curve", title: "Equity Curve", subtitle: "Over time (dummy)", kind: "line"},
    {id: "pnl_over_time", title: "PnL Over Time", subtitle: "Area trend (dummy)", kind: "area"},
    {id: "commission_by_symbol", title: "Commission by Symbol", subtitle: "Horizontal bars (dummy)", kind: "hbars"},
];

function ChartFrame({kind, height = 180}: { kind: ChartKind; height?: number }) {
    const common = {
        width: "100%",
        height,
        viewBox: "0 0 320 180",
        preserveAspectRatio: "none" as const,
    };

    switch (kind) {
        case "pie":
            return (
                <Box sx={{width: "100%", height}}>
                    <svg {...common}>
                        <circle cx="110" cy="90" r="58" fill="rgba(255,255,255,0.06)"/>
                        <path d="M110,90 L110,32 A58,58 0 0,1 162,122 Z" fill="rgba(255,255,255,0.14)"/>
                        <path d="M110,90 L162,122 A58,58 0 0,1 78,140 Z" fill="rgba(255,255,255,0.10)"/>
                        <path d="M110,90 L78,140 A58,58 0 0,1 110,32 Z" fill="rgba(255,255,255,0.08)"/>

                        <rect x="200" y="52" width="10" height="10" fill="rgba(255,255,255,0.14)"/>
                        <rect x="200" y="76" width="10" height="10" fill="rgba(255,255,255,0.10)"/>
                        <rect x="200" y="100" width="10" height="10" fill="rgba(255,255,255,0.08)"/>
                        <text x="216" y="61" fill="rgba(255,255,255,0.65)" fontSize="12">EURUSD</text>
                        <text x="216" y="85" fill="rgba(255,255,255,0.65)" fontSize="12">GBPUSD</text>
                        <text x="216" y="109" fill="rgba(255,255,255,0.65)" fontSize="12">XAUUSD</text>
                    </svg>
                </Box>
            );

        case "donut":
            return (
                <Box sx={{width: "100%", height}}>
                    <svg {...common}>
                        <circle cx="120" cy="90" r="52" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="18"/>
                        <path
                            d="M120,38 A52,52 0 0,1 168,112"
                            fill="none"
                            stroke="rgba(255,255,255,0.18)"
                            strokeWidth="18"
                            strokeLinecap="round"
                        />
                        <path
                            d="M168,112 A52,52 0 0,1 92,140"
                            fill="none"
                            stroke="rgba(255,255,255,0.12)"
                            strokeWidth="18"
                            strokeLinecap="round"
                        />
                        <circle cx="120" cy="90" r="30" fill="rgba(0,0,0,0.35)"/>
                        <text x="120" y="96" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="14"
                              fontWeight="700">
                            62%
                        </text>

                        <rect x="210" y="72" width="10" height="10" fill="rgba(255,255,255,0.18)"/>
                        <rect x="210" y="96" width="10" height="10" fill="rgba(255,255,255,0.12)"/>
                        <text x="226" y="81" fill="rgba(255,255,255,0.65)" fontSize="12">Wins</text>
                        <text x="226" y="105" fill="rgba(255,255,255,0.65)" fontSize="12">Losses</text>
                    </svg>
                </Box>
            );

        case "bars":
            return (
                <Box sx={{width: "100%", height}}>
                    <svg {...common}>
                        <line x1="40" y1="150" x2="300" y2="150" stroke="rgba(255,255,255,0.12)"/>
                        <line x1="40" y1="28" x2="40" y2="150" stroke="rgba(255,255,255,0.12)"/>

                        {[
                            {x: 60, h: 58},
                            {x: 92, h: 86},
                            {x: 124, h: 44},
                            {x: 156, h: 102},
                            {x: 188, h: 72},
                            {x: 220, h: 38},
                            {x: 252, h: 90},
                        ].map((b, i) => (
                            <rect key={i} x={b.x} y={150 - b.h} width="18" height={b.h} rx="6"
                                  fill="rgba(255,255,255,0.14)"/>
                        ))}
                    </svg>
                </Box>
            );

        case "line":
            return (
                <Box sx={{width: "100%", height}}>
                    <svg {...common}>
                        <line x1="36" y1="150" x2="304" y2="150" stroke="rgba(255,255,255,0.12)"/>
                        <line x1="36" y1="26" x2="36" y2="150" stroke="rgba(255,255,255,0.12)"/>

                        <path
                            d="M36 128 C70 110, 90 82, 120 96 C150 110, 176 68, 208 78 C240 88, 262 56, 304 62"
                            fill="none"
                            stroke="rgba(255,255,255,0.22)"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <path
                            d="M36 128 C70 110, 90 82, 120 96 C150 110, 176 68, 208 78 C240 88, 262 56, 304 62"
                            fill="none"
                            stroke="rgba(255,255,255,0.10)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            opacity="0.35"
                        />
                    </svg>
                </Box>
            );

        case "area":
            return (
                <Box sx={{width: "100%", height}}>
                    <svg {...common}>
                        <defs>
                            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="rgba(255,255,255,0.18)"/>
                                <stop offset="1" stopColor="rgba(255,255,255,0.02)"/>
                            </linearGradient>
                        </defs>

                        <line x1="36" y1="150" x2="304" y2="150" stroke="rgba(255,255,255,0.12)"/>
                        <line x1="36" y1="26" x2="36" y2="150" stroke="rgba(255,255,255,0.12)"/>

                        <path
                            d="M36 132 C72 116, 96 92, 126 104 C156 116, 182 74, 214 84 C246 94, 270 70, 304 76 L304 150 L36 150 Z"
                            fill="url(#areaFill)"
                        />
                        <path
                            d="M36 132 C72 116, 96 92, 126 104 C156 116, 182 74, 214 84 C246 94, 270 70, 304 76"
                            fill="none"
                            stroke="rgba(255,255,255,0.22)"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>
                </Box>
            );

        case "hbars":
            return (
                <Box sx={{width: "100%", height}}>
                    <svg {...common}>
                        <line x1="60" y1="24" x2="60" y2="156" stroke="rgba(255,255,255,0.12)"/>
                        {[{y: 42, w: 200}, {y: 72, w: 150}, {y: 102, w: 230}, {y: 132, w: 120}].map((b, i) => (
                            <rect key={i} x="60" y={b.y} width={b.w} height="16" rx="7" fill="rgba(255,255,255,0.14)"/>
                        ))}
                        <text x="16" y="54" fill="rgba(255,255,255,0.55)" fontSize="12">EUR</text>
                        <text x="16" y="84" fill="rgba(255,255,255,0.55)" fontSize="12">GBP</text>
                        <text x="16" y="114" fill="rgba(255,255,255,0.55)" fontSize="12">XAU</text>
                        <text x="16" y="144" fill="rgba(255,255,255,0.55)" fontSize="12">NAS</text>
                    </svg>
                </Box>
            );

        default:
            return null;
    }
}

function ChartCard({
                       model,
                       onExpand,
                   }: {
    model: ChartCardModel;
    onExpand: (m: ChartCardModel) => void;
}) {
    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                bgcolor: "background.paper",
            }}
        >
            <Box sx={{px: 2, pt: 2, pb: 1.25}}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                    <Box sx={{minWidth: 0}}>
                        <Typography variant="subtitle1" fontWeight={800} noWrap>
                            {model.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {model.subtitle}
                        </Typography>
                    </Box>

                    <IconButton
                        size="small"
                        onClick={() => onExpand(model)}
                        sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                        }}
                    >
                        <OpenInFullRoundedIcon fontSize="small"/>
                    </IconButton>
                </Stack>
            </Box>

            <Divider/>

            <Box sx={{p: 2}}>
                <ChartFrame kind={model.kind} height={180}/>
            </Box>
        </Paper>
    );
}

export default function TradesChartsPanel() {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    const [open, setOpen] = React.useState(false);
    const [active, setActive] = React.useState<ChartCardModel | null>(null);

    const handleExpand = (m: ChartCardModel) => {
        setActive(m);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setActive(null);
    };

    return (
        <>
            <Box
                sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                        xl: "repeat(3, minmax(0, 1fr))",
                    },
                }}
            >
                {CHARTS.map((c) => (
                    <ChartCard key={c.id} model={c} onExpand={handleExpand}/>
                ))}
            </Box>

            <Dialog
                open={open}
                onClose={handleClose}
                fullScreen={isSmall}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: isSmall ? 0 : 3,
                        border: isSmall ? "none" : "1px solid",
                        borderColor: "divider",
                        overflow: "hidden",
                    },
                }}
            >
                <DialogTitle sx={{px: 2, py: 1.5}}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <Box sx={{minWidth: 0}}>
                            <Typography variant="subtitle1" fontWeight={900} noWrap>
                                {active?.title ?? "Chart"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                                {active?.subtitle ?? "Preview"}
                            </Typography>
                        </Box>

                        <IconButton
                            onClick={handleClose}
                            size="small"
                            sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2,
                            }}
                        >
                            <CloseRoundedIcon fontSize="small"/>
                        </IconButton>
                    </Stack>
                </DialogTitle>

                <Divider/>

                <DialogContent sx={{p: 2}}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            p: 2,
                        }}
                    >
                        <ChartFrame kind={active?.kind ?? "line"} height={isSmall ? 360 : 420}/>
                    </Paper>
                </DialogContent>
            </Dialog>
        </>
    );
}