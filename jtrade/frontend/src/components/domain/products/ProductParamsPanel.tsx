import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
    Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import type { Product, ProductParamRepeat, ProductParamType } from "@/types/products";

const TYPE_LABEL: Record<ProductParamType, string> = {
    number: "Number",
    boolean: "Yes / No",
    string: "Text",
    list: "List",
};
const REPEAT_LABEL: Record<ProductParamRepeat, string> = {
    once: "Once / account",
    "per-symbol": "Per symbol",
};

const showDefault = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

/** Read-only view of a product's params + a link to the dedicated page for CRUD. */
export default function ProductParamsPanel({ product }: { product: Product }) {
    const navigate = useNavigate();
    const params = product.params ?? [];

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={800}>Parameters ({params.length})</Typography>
                <Button
                    size="small" variant="text" startIcon={<TuneRoundedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => navigate(`/provider/product-params?product=${product._id}`)}
                    sx={{ textTransform: "none", fontWeight: 700, minWidth: 0 }}
                >
                    Manage parameters
                </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                The variables your code needs. The client fills them at purchase.
            </Typography>

            {params.length === 0 ? (
                <Typography variant="caption" color="text.disabled">No parameters yet.</Typography>
            ) : (
                <Table
                    size="small"
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, borderCollapse: "separate", "& td, & th": { borderColor: "divider" } }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 110 }}>Repeat</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 120 }}>Group</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 90 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 80 }}>Default</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 70 }}>Req.</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {params.map((p) => (
                            <TableRow key={p.key}>
                                <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{p.key}</TableCell>
                                <TableCell>{p.label}</TableCell>
                                <TableCell>{REPEAT_LABEL[p.repeat]}</TableCell>
                                <TableCell>{p.group || "—"}</TableCell>
                                <TableCell>{TYPE_LABEL[p.type]}</TableCell>
                                <TableCell>{showDefault(p.defaultValue)}</TableCell>
                                <TableCell>{p.required ? "Yes" : "No"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Box>
    );
}
