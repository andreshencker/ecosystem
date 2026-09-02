'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

interface SidebarItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

export function SidebarItem({ href, icon: Icon, label, active }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = active !== undefined ? active : pathname === href || pathname.startsWith(href + '/');

  return (
    <ListItemButton
      component={Link}
      href={href}
      selected={isActive}
      sx={(theme) => ({
        ...(isActive && {
          backgroundColor: theme.palette.action.selected,
          color: theme.palette.primary.main,
          borderLeft: `3px solid ${theme.palette.primary.main}`,
          borderRadius: 0,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }),
        ...(!isActive && {
          borderLeft: '3px solid transparent',
        }),
      })}
    >
      <ListItemIcon
        sx={{
          minWidth: 36,
          color: isActive ? 'primary.main' : 'text.secondary',
        }}
      >
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          variant: 'body2',
          fontWeight: isActive ? 600 : 400,
        }}
      />
    </ListItemButton>
  );
}
