export declare const MIME_TYPES: {
    readonly PDF: "application/pdf";
    readonly CSV: "text/csv";
    readonly XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    readonly XLS: "application/vnd.ms-excel";
    readonly JSON: "application/json";
    readonly HTML: "text/html";
    readonly TEXT: "text/plain";
    readonly PNG: "image/png";
    readonly JPEG: "image/jpeg";
    readonly GIF: "image/gif";
    readonly SVG: "image/svg+xml";
    readonly ZIP: "application/zip";
    readonly MULTIPART_FORM: "multipart/form-data";
    readonly FORM_URLENCODED: "application/x-www-form-urlencoded";
};
export type MimeType = (typeof MIME_TYPES)[keyof typeof MIME_TYPES];
