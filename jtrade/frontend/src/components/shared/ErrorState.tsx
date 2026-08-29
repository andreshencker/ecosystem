import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";

interface ErrorStateProps {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export function ErrorState({
    title = "Something went wrong",
    description = "An error occurred while loading this content. Please try again.",
    action,
}: ErrorStateProps) {
    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} textAlign="center">
            <ErrorOutlinedIcon sx={{ fontSize: 48, color: "error.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>{title}</Typography>
            {description && <Typography variant="body2" color="text.secondary" mb={action ? 3 : 0} maxWidth={480}>{description}</Typography>}
            {action && <Box>{action}</Box>}
        </Box>
    );
}
