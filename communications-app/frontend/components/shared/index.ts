// ─── Loading & error states ───────────────────────────────────────────────────
export { LoadingPage } from './LoadingPage';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
export { QueryError } from './QueryError';

// ─── Buttons & actions ────────────────────────────────────────────────────────
export { LoadingButton } from './LoadingButton';
export type { LoadingButtonProps } from './LoadingButton';
export { RowActions } from './RowActions';

// ─── Feedback ─────────────────────────────────────────────────────────────────
export { GlobalSnackbar } from './GlobalSnackbar';
export { FormError } from './FormError';
export { StatusBadge } from './StatusBadge';

// ─── Dialogs ─────────────────────────────────────────────────────────────────
export { ConfirmDialog } from './ConfirmDialog';

// ─── Data display ─────────────────────────────────────────────────────────────
export { DataTable } from './DataTable';
export type { DataTableProps, MobileCardConfig, MobileCardField } from './DataTable';

// ─── Permissions ─────────────────────────────────────────────────────────────
export { PermissionGuard } from './PermissionGuard';

// ─── Drawers & panels ─────────────────────────────────────────────────────────
export { FormDrawer } from './FormDrawer';

// ─── Toolbars ─────────────────────────────────────────────────────────────────
export { SearchToolbar } from './SearchToolbar';

// ─── Form controls ────────────────────────────────────────────────────────────
export { ControlledTextField } from './ControlledTextField';
export { ControlledSelect } from './ControlledSelect';
export type { SelectOption } from './ControlledSelect';
export { ControlledSwitch } from './ControlledSwitch';
export { ControlledCheckbox } from './ControlledCheckbox';
export { ControlledPasswordField } from './ControlledPasswordField';
export { ColorField } from './ColorField';

// ─── Domain utilities ─────────────────────────────────────────────────────────
export { DynamicCredentialForm } from './DynamicCredentialForm';
export type { CredentialFieldDef, CredentialFieldType } from './DynamicCredentialForm';
export { CREDENTIAL_SCHEMAS } from './DynamicCredentialForm';
