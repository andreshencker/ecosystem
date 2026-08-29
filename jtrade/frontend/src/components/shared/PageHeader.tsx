import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MuiLink from "@mui/material/Link";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    count?: number;
    breadcrumbs?: BreadcrumbItem[];
    actions?: React.ReactNode;
    subtitle?: string;
}

export function PageHeader({ title, count, breadcrumbs, actions, subtitle }: PageHeaderProps) {
    return (
        <Box mb={3}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
                    {breadcrumbs.map((crumb, index) =>
                        crumb.href ? (
                            <MuiLink key={index} component={RouterLink} to={crumb.href} underline="hover" color="text.secondary" variant="body2">
                                {crumb.label}
                            </MuiLink>
                        ) : (
                            <Typography key={index} variant="body2" color="text.primary">{crumb.label}</Typography>
                        ),
                    )}
                </Breadcrumbs>
            )}

            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={subtitle ? 0.5 : 0}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Typography variant="h5" component="h1">{title}</Typography>
                    {count !== undefined && <Chip label={count} size="small" sx={{ bgcolor: "action.selected", color: "text.secondary" }} />}
                </Box>

                {actions && <Box display="flex" alignItems="center" gap={1}>{actions}</Box>}
            </Box>

            {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}

            <Divider sx={{ mt: 2 }} />
        </Box>
    );
}
