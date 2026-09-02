import * as React from "react";
import {
    Button,
    ButtonProps,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";

type ConfirmDeleteButtonProps = {
    /** Acción que se ejecuta cuando el usuario confirma eliminar */
    onConfirm: () => void | Promise<void>;
    /** Texto descriptivo del recurso a eliminar (ej: "platform binance") */
    itemLabel?: string;
    /** Texto del botón (por defecto: "Delete") */
    label?: string;
    /** Deshabilitar el botón principal */
    disabled?: boolean;
    /** Props visuales opcionales del botón */
    size?: ButtonProps["size"];
    variant?: ButtonProps["variant"];
};

export default function ConfirmDeleteButton({
                                                onConfirm,
                                                itemLabel,
                                                label = "Delete",
                                                disabled,
                                                size = "small",
                                                variant = "outlined",
                                            }: ConfirmDeleteButtonProps) {
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    const handleOpen = () => {
        if (disabled) return;
        setOpen(true);
    };

    const handleClose = () => {
        if (loading) return;
        setOpen(false);
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);
            await onConfirm();
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const description =
        itemLabel != null
            ? `Are you sure you want to delete ${itemLabel}? This action cannot be undone.`
            : "Are you sure you want to delete this item? This action cannot be undone.";

    return (
        <>
            <Button
                size={size}
                variant={variant}
                color="error"
                onClick={handleOpen}
                disabled={disabled || loading}
            >
                {label}
            </Button>

            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle>Delete confirmation</DialogTitle>
                <DialogContent>
                    <DialogContentText>{description}</DialogContentText>
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 2}}>
                    <Button onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        color="error"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}