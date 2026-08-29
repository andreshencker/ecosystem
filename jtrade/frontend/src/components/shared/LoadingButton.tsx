import * as React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

export interface LoadingButtonProps extends ButtonProps {
    loading?: boolean;
}

export function LoadingButton({ loading = false, disabled = false, children, startIcon, ...props }: LoadingButtonProps) {
    return (
        <Button {...props} disabled={disabled || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}>
            {children}
        </Button>
    );
}
