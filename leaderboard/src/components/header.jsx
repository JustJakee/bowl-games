import React, { useState } from 'react';
import { AppBar, Box, Button, Toolbar, Tooltip, IconButton, Typography, Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import MenuIcon from '@mui/icons-material/Menu';

const Header = ({ currentPage, setCurrentPage }) => {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTooltipOpen = () => setOpen(true);
  const handleTooltipClose = () => setOpen(false);

  const navItems = [
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'schedule-view', label: 'Games' },
    { id: 'full-view', label: 'Full View' },
    { id: 'pick-winners', label: 'Pick Winners' },
  ];

  return (
    <>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: 'fixed', top: 0, left: 0, width: '100%',
          bgcolor: 'error.main', color: '#fff', zIndex: (t) => t.zIndex.appBar + 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
          height: 28,
        }}
      >
        <Typography variant="caption" fontWeight={700}>Demo Mode</Typography>
        <Tooltip
          title={
            <Typography variant="body2" sx={{ color: 'white' }}>
              The website is not up to date and will resume next season.
            </Typography>
          }
          open={open}
          onClose={handleTooltipClose}
          arrow
        >
          <IconButton size="small" sx={{ color: 'inherit' }} onClick={handleTooltipOpen} aria-label="Demo mode information">
            <InfoIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Box>

      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          top: 28,
          bgcolor: 'var(--color-surface-2)',
          color: 'var(--color-text)',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 48, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography component="h1" variant="h6" fontWeight={800} noWrap sx={{ mr: 1 }}>
            Bob's Bowl Game Pick 'em
          </Typography>

          {/* Desktop nav */}
          <Box role="navigation" aria-label="Primary Navigation" sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, flexWrap: 'wrap' }}>
            {navItems.map((item) => (
              <Button
                key={item.id}
                size="small"
                onClick={() => setCurrentPage(item.id)}
                aria-current={currentPage === item.id ? 'page' : undefined}
                variant={currentPage === item.id ? 'contained' : 'text'}
                sx={{
                  textTransform: 'uppercase', fontWeight: 700,
                  ...(currentPage === item.id
                    ? { bgcolor: 'var(--accent)', color: 'var(--accent-contrast)', '&:hover': { bgcolor: 'var(--accent)' } }
                    : { color: 'var(--color-text)' })
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile menu trigger */}
          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'var(--color-text)' }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer navigation */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { bgcolor: 'var(--color-surface)', color: 'var(--color-text)', width: 260, mt: '28px' } }}
      >
        <List role="menu" aria-label="Mobile Navigation">
          {navItems.map((item) => (
            <ListItemButton
              key={item.id}
              role="menuitem"
              selected={currentPage === item.id}
              onClick={() => { setCurrentPage(item.id); setMobileOpen(false); }}
              sx={{ '&.Mui-selected': { bgcolor: 'var(--color-hover)' } }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </>
  );
};

export default Header;
