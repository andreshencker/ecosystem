import { Box, Chip, Container, Stack, TextField, Typography } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { ProductCard, type ProductPreview } from "@/old/app/common/components/public/ProductCard";
import { PublicFooter } from "@/old/app/common/components/public/PublicFooter";

const products: ProductPreview[] = [
    { name: "Momentum Grid", type: "Bot", platforms: ["MT4", "MT5"], description: "Configurable momentum and grid execution.", price: "$49", accent: "#f97316" },
    { name: "Structure Scanner", type: "Indicator", platforms: ["TradingView", "cTrader"], description: "Market structure and confirmation zones.", price: "$29", accent: "#6366f1" },
    { name: "Risk Pilot", type: "Utility", platforms: ["MT5", "cTrader"], description: "Sizing and exposure protection.", price: "$19", accent: "#10b981" },
    { name: "Session Breakout", type: "Strategy", platforms: ["MT4", "MT5"], description: "Rules for London and New York breakouts.", price: "$39", accent: "#ec4899" },
    { name: "News Shield", type: "Utility", platforms: ["MT5"], description: "Execution controls around economic events.", price: "$15", accent: "#0ea5e9" },
    { name: "Trend Engine", type: "Bot", platforms: ["cTrader"], description: "Multi-timeframe trend automation.", price: "$59", accent: "#8b5cf6" },
];
export default function MarketplacePage() { return <Box><Container maxWidth="lg" sx={{ pt: { xs: 7, md: 10 } }}><Chip label="PUBLIC MARKETPLACE" /><Typography variant="h1" sx={{ mt: 2, fontSize: { xs: 44, md: 68 }, letterSpacing: "-.055em" }}>Find your next trading tool.</Typography><Typography color="text.secondary" fontSize={18} maxWidth={680} mt={2}>Browse bots, indicators, strategies and utilities created by independent trading developers.</Typography><Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mt={5}><TextField fullWidth placeholder="Search products, developers or strategies" InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: "text.secondary" }} /> }} />{["Bots", "Indicators", "Utilities", "Strategies"].map(x => <Chip key={x} label={x} variant="outlined" clickable />)}</Stack><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)" }, gap: 2, mt: 4 }}>{products.map(p => <ProductCard key={p.name} product={p} />)}</Box></Container><PublicFooter /></Box>; }
