'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

export interface PropertyDef {
  name: string;
  type: string;
  required: 'Yes' | 'No' | string; // e.g. "When enabled"
  description: string;
  example?: string;
}

interface ContractPropertyRefProps {
  properties: PropertyDef[];
}

export function ContractPropertyRef({ properties }: ContractPropertyRefProps) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table
        size="small"
        sx={{ minWidth: 480, '& td, & th': { fontSize: '0.78rem', verticalAlign: 'top' } }}
        aria-label="Contract property reference"
      >
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50', borderBottom: '2px solid', borderColor: 'divider' } }}>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>Property</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>Type</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>Required</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Example</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {properties.map((p) => (
            <TableRow key={p.name} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell>
                <Typography
                  component="code"
                  variant="caption"
                  fontFamily="monospace"
                  fontWeight={700}
                  color="primary.main"
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {p.name}
                </Typography>
              </TableCell>

              <TableCell>
                <Chip
                  label={p.type}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              </TableCell>

              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Typography
                  variant="caption"
                  color={
                    p.required === 'Yes'
                      ? 'error.main'
                      : p.required.startsWith('When')
                        ? 'warning.dark'
                        : 'text.disabled'
                  }
                  fontWeight={p.required === 'Yes' ? 700 : 400}
                >
                  {p.required}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {p.description}
                </Typography>
              </TableCell>

              <TableCell>
                {p.example && (
                  <Typography
                    component="code"
                    variant="caption"
                    fontFamily="monospace"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre' }}
                  >
                    {p.example}
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
