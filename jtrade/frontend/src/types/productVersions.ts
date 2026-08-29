// src/types/productVersions.ts
export type ProductVersion = {
    id?: string;
    _id: string;
    productId: string;
    platformId: string;
    version: string;
    fileName: string;
    originalFileName: string;
    extension: string;
    fileKey: string;
    size: number;
    contentType: string;
    releaseNotes: string;
    status: "draft" | "published" | "deprecated";
    isCurrentVersion: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type UploadProductVersionPayload = {
    platformId: string;
    version: string;
    releaseNotes?: string;
    isCurrentVersion?: boolean;
    file: File;
};

export type ReplaceProductVersionFilePayload = {
    versionId: string;
    version?: string;
    releaseNotes?: string;
    isCurrentVersion?: boolean;
    file: File;
};
