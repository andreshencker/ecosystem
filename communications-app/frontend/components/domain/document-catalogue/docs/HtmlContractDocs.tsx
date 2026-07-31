'use client';

import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';

export function HtmlContractDocs() {
  return (
    <Box pt={2.5}>
      <Stack spacing={2.5}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <BlockOutlinedIcon color="disabled" />
          <Typography variant="h6" color="text.secondary">HTML Format — Not Available</Typography>
        </Box>

        <Alert severity="error">
          <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
            No HTML renderer is registered in the current backend
          </Typography>
          <Typography variant="caption">
            The <code>RendererRegistry</code> in{' '}
            <code>src/files/generator/renderers/renderer.registry.ts</code> registers only three renderers:
            <code> PdfRendererService</code>, <code>CsvRendererService</code> and <code>XlsxRendererService</code>.
            Calling <code>POST /files/generate</code> with <code>format: &quot;html&quot;</code> will throw:
          </Typography>
          <Box
            component="pre"
            sx={{ mt: 1, p: 1, bgcolor: 'error.50', borderRadius: 0.5, fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
          >
            {`Error: No renderer for format "html"`}
          </Box>
        </Alert>

        <Box>
          <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary" display="block" mb={1}>
            What this means
          </Typography>
          <Stack spacing={0.75}>
            {[
              'A Document Domain may include "html" in its allowedFormats list — this is a data configuration and is not blocked.',
              'A Document Catalogue entry may have an html contract saved — the contract schema accepts it.',
              'The backend validator does not block html contracts.',
              'However, calling the Files renderer with format "html" at generation time will fail.',
              'This format contract will remain inert until an HTML renderer is added to RendererRegistry.',
            ].map((line) => (
              <Box key={line} display="flex" gap={1} alignItems="flex-start">
                <Typography variant="caption" color="warning.main" sx={{ minWidth: 12 }}>⚠</Typography>
                <Typography variant="caption" color="text.secondary">{line}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Alert severity="info" sx={{ py: 0.5 }}>
          <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>When HTML support is implemented</Typography>
          <Typography variant="caption">
            An HTML renderer would need to be created, implement <code>IFileRenderer</code>,
            and be registered in <code>RendererRegistry</code>. The contract schema in{' '}
            <code>document-catalogue.schema.ts</code> would need a corresponding <code>HtmlFormatContract</code>
            sub-schema. Only then should the contract editor and documentation be enabled.
          </Typography>
        </Alert>

        <Typography variant="caption" color="text.disabled" fontStyle="italic">
          No example contract, generation payload or expected output is provided because HTML generation is
          not currently functional. Providing a fake example would misrepresent the real system capabilities.
        </Typography>
      </Stack>
    </Box>
  );
}
