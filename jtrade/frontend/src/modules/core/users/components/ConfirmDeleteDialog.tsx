// src/modules/users/components/ConfirmDeleteDialog.tsx
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography,} from "@mui/material";
import type {User} from "../types/user";

type Props = {
    open: boolean;
    user?: User;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
};

export default function ConfirmDeleteDialog({
                                                open,
                                                user,
                                                onClose,
                                                onConfirm,
                                            }: Props) {
    const fullName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(" ");

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Delete user</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to delete the following user?
                </DialogContentText>
                {user && (
                    <Typography sx={{mt: 2}}>
                        <strong>{fullName || user.email}</strong>
                        <br/>
                        <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                        >
                            {user.email}
                        </Typography>
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleConfirm}
                    color="error"
                    variant="contained"
                    disableElevation
                >
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
}