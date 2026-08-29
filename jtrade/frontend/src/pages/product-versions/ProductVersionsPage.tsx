import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import PublishedWithChangesOutlinedIcon from "@mui/icons-material/PublishedWithChangesOutlined";
import DriveFileRenameOutlineOutlinedIcon from "@mui/icons-material/DriveFileRenameOutlineOutlined";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";

import ProductVersionUploadForm, { ProductVersionFormValues } from "@/components/domain/product-versions/ProductVersionUploadForm";
import type { ProductVersion } from "@/types/productVersions";

import { useProducts } from "@/hooks/api/useProducts";
import {
    useDownloadProductVersion,
    useMarkCurrentProductVersion,
    useProductVersions,
    useReplaceProductVersionFile,
    useUploadProductVersion,
} from "@/hooks/api/useProductVersions";

function formatSize(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function ProductVersionsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const productId = searchParams.get("productId") ?? "";

    const productsQuery = useProducts("mine");
    const products = productsQuery.data ?? [];

    const versionsQuery = useProductVersions(productId || null);
    const versions = versionsQuery.data ?? [];

    const uploadVersion = useUploadProductVersion(productId || null);
    const replaceFile = useReplaceProductVersionFile(productId || null);
    const markCurrent = useMarkCurrentProductVersion(productId || null);
    const downloadVersion = useDownloadProductVersion(productId || null);

    const [openUpload, setOpenUpload] = React.useState(false);
    const [replaceTarget, setReplaceTarget] = React.useState<ProductVersion | null>(null);

    const selectedProduct = products.find((p) => p._id === productId);

    const handleSelectProduct = (id: string) => setSearchParams(id ? { productId: id } : {});

    const handleUpload = async (values: ProductVersionFormValues, file: File) => {
        await uploadVersion.mutateAsync({ ...values, file });
        setOpenUpload(false);
    };

    const handleReplace = async (values: ProductVersionFormValues, file: File) => {
        if (!replaceTarget) return;
        await replaceFile.mutateAsync({ versionId: replaceTarget._id, version: values.version, releaseNotes: values.releaseNotes, isCurrentVersion: values.isCurrentVersion, file });
        setReplaceTarget(null);
    };

    const handleDownload = async (row: ProductVersion) => {
        const result = await downloadVersion.mutateAsync(row._id);
        window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    };

    const columns: GridColDef<ProductVersion>[] = [
        { field: "version", headerName: "Version", width: 130, renderCell: (p) => (
            <span style={{ fontWeight: 800 }}>{p.row.version}</span>
        ) },
        { field: "isCurrentVersion", headerName: "Current", width: 110, renderCell: (p) => (
            p.row.isCurrentVersion ? <Chip size="small" color="success" label="Current" /> : null
        ) },
        { field: "originalFileName", headerName: "File", flex: 1, minWidth: 180 },
        { field: "size", headerName: "Size", width: 100, valueGetter: (_v, row) => formatSize(row.size) },
        { field: "releaseNotes", headerName: "Release notes", flex: 1, minWidth: 200 },
    ];

    return (
        <>
            <PageHeader
                title="Product Versions"
                count={versions.length}
                subtitle="Upload, replace and manage the downloadable versions for each product platform."
                actions={
                    <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={() => setOpenUpload(true)} disabled={!productId} sx={{ textTransform: "none", fontWeight: 700 }}>
                        Upload version
                    </LoadingButton>
                }
            />

            <FormControl size="small" sx={{ minWidth: 280, mb: 2 }}>
                <InputLabel>Product</InputLabel>
                <Select value={productId} label="Product" onChange={(e) => handleSelectProduct(e.target.value)}>
                    <MenuItem value="">Select a product…</MenuItem>
                    {products.map((p) => <MenuItem key={p._id} value={p._id}>{p.name} ({p.key})</MenuItem>)}
                </Select>
            </FormControl>

            {!productId ? (
                <EmptyState title="Select a product" description="Choose which product's versions to view above." />
            ) : (
                <DataTable<ProductVersion>
                    columns={columns}
                    rows={versions}
                    total={versions.length}
                    page={0}
                    pageSize={50}
                    onPageChange={() => {}}
                    onPageSizeChange={() => {}}
                    loading={versionsQuery.isFetching}
                    getRowId={(row) => row._id}
                    rowActions={(row) => (
                        <>
                            <Tooltip title="Download">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); void handleDownload(row); }}>
                                    <DownloadOutlinedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Replace file">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setReplaceTarget(row); }}>
                                    <DriveFileRenameOutlineOutlinedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={row.isCurrentVersion ? "Already current" : "Mark as current"}>
                                <span>
                                    <IconButton size="small" disabled={row.isCurrentVersion} onClick={(e) => { e.stopPropagation(); markCurrent.mutate(row._id); }}>
                                        <PublishedWithChangesOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </>
                    )}
                    emptyState={<EmptyState title="No versions yet" description={selectedProduct ? `Upload the first version for ${selectedProduct.name}.` : undefined} />}
                    mobileCardConfig={{
                        primaryText: "version",
                        secondaryText: "originalFileName",
                        badge: (row) => row.isCurrentVersion ? <Chip size="small" color="success" label="Current" /> : null,
                        fields: [
                            { field: "size", label: "Size", render: (_v, row) => formatSize(row.size) },
                            { field: "releaseNotes", label: "Notes" },
                        ],
                    }}
                />
            )}

            <FormDrawer open={openUpload} onClose={() => setOpenUpload(false)} title="Upload version" width={560}>
                <ProductVersionUploadForm loading={uploadVersion.isPending} onSubmit={handleUpload} onCancel={() => setOpenUpload(false)} />
            </FormDrawer>

            <FormDrawer open={!!replaceTarget} onClose={() => setReplaceTarget(null)} title={`Replace file — v${replaceTarget?.version ?? ""}`} width={560}>
                {replaceTarget && (
                    <ProductVersionUploadForm
                        fixedPlatformId={String(replaceTarget.platformId)}
                        initialVersion={replaceTarget.version}
                        loading={replaceFile.isPending}
                        submitLabel="Replace file"
                        onSubmit={handleReplace}
                        onCancel={() => setReplaceTarget(null)}
                    />
                )}
            </FormDrawer>
        </>
    );
}
