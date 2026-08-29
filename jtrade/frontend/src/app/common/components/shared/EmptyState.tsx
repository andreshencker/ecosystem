import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface EmptyStateProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
    icon?: React.ElementType;
}

export function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
    return (
        <Box py={4} textAlign="center">
            {Icon && (
                <Box mb={2} display="flex" justifyContent="center">
                    <Icon sx={{ fontSize: 48, color: "text.secondary" }} />
                </Box>
            )}
            <Typography variant="h6" gutterBottom>{title}</Typography>
            {description && <Typography variant="body2" color="text.secondary" mb={action ? 3 : 0}>{description}</Typography>}
            {action && <Box mt={description ? 0 : 2}>{action}</Box>}
        </Box>
    );
}
