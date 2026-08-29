import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

export type ProductPreview = { name: string; type: string; platforms: string[]; description: string; price: string; accent: string };
export function ProductCard({ product }: { product: ProductPreview }) {
    return <Card sx={{ height: "100%", borderRadius: 4, overflow: "hidden" }}><Box sx={{ height: 150, p: 2.5, display: "flex", alignItems: "flex-end", background: `linear-gradient(135deg, ${product.accent}, #17151f)` }}><Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: "rgba(255,255,255,.92)", color: "#111", display: "grid", placeItems: "center" }}><TrendingUpRoundedIcon /></Box></Box><CardContent sx={{ p: 2.5 }}><Stack direction="row" justifyContent="space-between" gap={1}><Chip size="small" label={product.type} /><Typography fontWeight={900}>{product.price}</Typography></Stack><Typography variant="h6" fontWeight={900} mt={2}>{product.name}</Typography><Typography variant="body2" mt={.75}>{product.description}</Typography><Stack direction="row" spacing={.75} mt={2} flexWrap="wrap">{product.platforms.map((item) => <Chip key={item} size="small" variant="outlined" label={item} />)}</Stack><Button fullWidth variant="outlined" sx={{ mt: 2.5 }}>View product</Button></CardContent></Card>;
}
