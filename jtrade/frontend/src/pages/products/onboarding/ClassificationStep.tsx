import * as React from "react";
import { Alert, Autocomplete, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";

import type { Product } from "@/types/products";
import { PRODUCT_CATEGORIES } from "@/constants/productClassification";

export function useClassificationForm(product: Product | null) {
    const [category, setCategory] = React.useState("");
    const [tags, setTags] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (!product) return;
        setCategory(product.category ?? "");
        setTags(product.tags ?? []);
    }, [product]);

    const valid = category.trim().length > 0;

    const payload = () => ({
        category: category.trim().toLowerCase(),
        tags: [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
    });

    return { category, setCategory, tags, setTags, valid, payload };
}

export default function ClassificationStep({ form }: { form: ReturnType<typeof useClassificationForm> }) {
    const { category, setCategory, tags, setTags } = form;

    return (
        <Stack spacing={2.5} sx={{ maxWidth: 640 }}>
            <Typography variant="body2" color="text.secondary">
                This helps customers find your product in the Marketplace. It does not change what the
                product is — the product type was already chosen and cannot be changed.
            </Typography>

            <TextField
                select label="Category *" value={category}
                onChange={(e) => setCategory(e.target.value)}
                InputLabelProps={{ shrink: true }}
            >
                {PRODUCT_CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>

            <Autocomplete
                multiple freeSolo options={[]}
                value={tags}
                onChange={(_e, next) => setTags(next.map((t) => String(t)))}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                        const { key, ...rest } = getTagProps({ index });
                        return <Chip key={key} size="small" label={option} {...rest} />;
                    })
                }
                renderInput={(params) => (
                    <TextField {...params} label="Tags" placeholder="Add a tag and press Enter"
                        helperText="Optional. Free-text keywords for search and filtering."
                        InputLabelProps={{ shrink: true }} />
                )}
            />

            <Alert severity="info" variant="outlined">
                A dedicated Category catalogue and Product Family grouping are deferred to a later phase.
            </Alert>
        </Stack>
    );
}
