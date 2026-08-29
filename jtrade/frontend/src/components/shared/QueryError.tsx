import * as React from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

interface QueryErrorProps {
    message?: string;
    onRetry?: () => void;
}

export function QueryError({ message = "An error occurred. Please try again.", onRetry }: QueryErrorProps) {
    return (
        <Alert
            severity="error"
            action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : undefined}
        >
            {message}
        </Alert>
    );
}
