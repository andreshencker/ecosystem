import React from 'react';
import Alert from '@mui/material/Alert';

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return <Alert severity="error">{message}</Alert>;
}
