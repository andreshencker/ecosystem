import * as React from "react";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

/**
 * Reusable field label: text + optional required marker + a contextual help
 * icon. The help opens on hover (desktop) and tap (mobile). Meant to sit above
 * an input so rich help content and layouts aren't constrained by MUI's
 * floating-label slot. Reuse across every onboarding step.
 */
export function FieldLabelWithHelp({
    label,
    required = false,
    help,
    htmlFor,
}: {
    label: React.ReactNode;
    required?: boolean;
    help?: React.ReactNode;
    htmlFor?: string;
}) {
    return (
        <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            component={htmlFor ? "label" : "div"}
            {...(htmlFor ? { htmlFor } : {})}
            sx={{ cursor: htmlFor ? "pointer" : "default" }}
        >
            <Typography variant="body2" fontWeight={700} component="span">
                {label}
                {required && (
                    <Box component="span" sx={{ color: "error.main", ml: 0.25 }} aria-hidden>
                        *
                    </Box>
                )}
            </Typography>
            {help && (
                <Tooltip
                    arrow
                    enterTouchDelay={0}
                    leaveTouchDelay={6000}
                    title={<Box sx={{ p: 0.5, maxWidth: 280, fontSize: 12.5, lineHeight: 1.5 }}>{help}</Box>}
                >
                    <HelpOutlineRoundedIcon
                        role="button"
                        aria-label="Help"
                        tabIndex={0}
                        onClick={(e) => e.preventDefault()}
                        sx={{ fontSize: 15, color: "text.disabled", cursor: "help", "&:hover": { color: "text.secondary" } }}
                    />
                </Tooltip>
            )}
        </Stack>
    );
}

/** Label-with-help stacked above an input (or any control). */
export function LabeledField({
    label,
    required,
    help,
    children,
    htmlFor,
}: {
    label: React.ReactNode;
    required?: boolean;
    help?: React.ReactNode;
    children: React.ReactNode;
    htmlFor?: string;
}) {
    return (
        <Stack spacing={0.75}>
            <FieldLabelWithHelp label={label} required={required} help={help} htmlFor={htmlFor} />
            {children}
        </Stack>
    );
}
