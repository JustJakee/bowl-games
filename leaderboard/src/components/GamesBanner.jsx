import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Chip, Divider, CircularProgress, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import { fetchNcaafScoreboard } from '../api/espn';

const formatGame = (evt) => {
  try {
    const comp = evt?.competitions?.[0];
    const status = comp?.status?.type?.shortDetail || evt?.status?.type?.shortDetail || '';
    const competitors = comp?.competitors || [];
    const away = competitors.find((c) => c.homeAway === 'away');
    const home = competitors.find((c) => c.homeAway === 'home');
    const awayAbbr = away?.team?.abbreviation || away?.team?.shortDisplayName || away?.team?.name || 'Away';
    const homeAbbr = home?.team?.abbreviation || home?.team?.shortDisplayName || home?.team?.name || 'Home';
    const awayScore = away?.score ?? '';
    const homeScore = home?.score ?? '';
    return { status, awayAbbr, homeAbbr, awayScore, homeScore };
  } catch {
    return { status: '', awayAbbr: 'Away', homeAbbr: 'Home', awayScore: '', homeScore: '' };
  }
};

const RawDataPreview = ({ data }) => {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ ml: 2 }}>
      <Button size="small" onClick={() => setOpen((v) => !v)} sx={{ color: 'var(--color-text)' }}>
        {open ? 'Hide raw JSON' : 'Show raw JSON'}
      </Button>
      {open && (
        <Box component="pre" sx={{ maxHeight: 240, overflow: 'auto', p: 1, bgcolor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 1 }}>
          {JSON.stringify(data, null, 2)}
        </Box>
      )}
    </Box>
  );
};

const GamesBanner = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Basic call; customize via params if needed (e.g., { dates: '20250101' })
      const res = await fetchNcaafScoreboard();
      setData(res);
    } catch (e) {
      setError(e?.message || 'Failed to fetch NCAAF data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const items = useMemo(() => {
    const events = data?.events || [];
    return events.slice(0, 12).map((evt) => formatGame(evt));
  }, [data]);

  const headerLabel = useMemo(() => {
    const season = data?.season?.year;
    const week = data?.week?.number;
    if (season && week) return `NCAAF ${season} • Week ${week}`;
    if (season) return `NCAAF ${season}`;
    return 'NCAAF Scoreboard';
  }, [data]);

  return (
    <Box sx={{
      mt: 'calc(var(--banner-h) + var(--appbar-h) + 8px)',
      mb: 2,
      px: 2,
      py: 1,
      bgcolor: 'var(--color-surface-2)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
      borderRadius: 1,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <SportsFootballIcon fontSize="small" />
        <Typography variant="subtitle2" fontWeight={800} sx={{ mr: 'auto' }}>
          {headerLabel}
        </Typography>
        <Tooltip title="Refresh">
          <span>
            <IconButton size="small" onClick={load} disabled={loading} sx={{ color: 'var(--color-text)' }}>
              <RefreshIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2">Loading NCAAF scoreboard…</Typography>
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffb4ab' }}>
          <ErrorOutlineIcon fontSize="small" />
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}

      {!loading && !error && (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 1, py: 1 }}>
            {items.length === 0 && (
              <Typography variant="body2" color="var(--color-muted)">No games found.</Typography>
            )}
            {items.map((g, idx) => (
              <Chip
                key={idx}
                sx={{
                  bgcolor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)'
                }}
                label={`${g.awayAbbr} ${g.awayScore} @ ${g.homeAbbr} ${g.homeScore} • ${g.status}`}
              />
            ))}
          </Box>
          <Divider sx={{ my: 1, borderColor: 'var(--color-border)' }} />
          <RawDataPreview data={data} />
        </>
      )}
    </Box>
  );
};

export default GamesBanner;

