'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import SearchIcon from '@mui/icons-material/Search';

interface SearchToolbarProps {
  /** Controlled search value. */
  search: string;
  /** Called on every keystroke. Parent should also reset pagination (setPage(0)). */
  onSearchChange: (value: string) => void;
  /** Placeholder text inside the search field. */
  placeholder?: string;
  /** Additional filter controls rendered after the search field. */
  children?: React.ReactNode;
  /** Whether any filter is currently active. When true, renders a Clear button. */
  hasActiveFilters?: boolean;
  /** Called when the Clear button is clicked. */
  onClearFilters?: () => void;
  /** Clear button label (default: "Clear"). */
  clearLabel?: string;
}

/**
 * Standardized search + optional filter toolbar used by every list page.
 *
 * Usage:
 *   <SearchToolbar
 *     search={search}
 *     onSearchChange={(v) => { setSearch(v); setPage(0); }}
 *     hasActiveFilters={hasActiveFilters}
 *     onClearFilters={clearFilters}
 *   >
 *     <FormControl size="small" sx={{ width: { xs: '100%', sm: 150 } }}>
 *       <InputLabel>Role</InputLabel>
 *       <Select ...>...</Select>
 *     </FormControl>
 *   </SearchToolbar>
 */
export function SearchToolbar({
  search,
  onSearchChange,
  placeholder = 'Search…',
  children,
  hasActiveFilters = false,
  onClearFilters,
  clearLabel = 'Clear',
}: SearchToolbarProps) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        />

        {children}

        {hasActiveFilters && onClearFilters && (
          <Button
            size="small"
            variant="text"
            startIcon={<ClearOutlinedIcon fontSize="small" />}
            onClick={onClearFilters}
            sx={{ width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
          >
            {clearLabel}
          </Button>
        )}
      </Box>
    </Paper>
  );
}
