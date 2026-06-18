import { Divider, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import Panel from "../common/Panel";
import SectionHeader from "./SectionHeader";
import StatusChip from "../common/StatusChip";

const EntriesCard = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <Panel sx={{ height: "100%" }}>
        <Stack spacing={1.5}>
          <SectionHeader title="My Entries" actionLabel="View All Entries" actionTo="/entries" />
          <Stack spacing={0.75}>
            <Typography variant="subtitle1" sx={{ fontSize: "1rem", fontWeight: 700 }}>
              No entries yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem", lineHeight: 1.4 }}>
              Your saved pick entries will appear here after you start making picks.
            </Typography>
          </Stack>
        </Stack>
      </Panel>
    );
  }

  return (
    <Panel sx={{ height: "100%" }}>
      <Stack spacing={1.5}>
        <SectionHeader title="My Entries" actionLabel="View All Entries" actionTo="/entries" />
        <List disablePadding>
          {entries.map((entry, index) => (
            <div key={entry.id}>
              <ListItemButton sx={{ px: 0, py: 1.1, borderRadius: 2, minHeight: { lg: 52 } }}>
                <ListItemText
                  primary={entry.name}
                  secondary={`${entry.completedPicks} / ${entry.totalPicks} complete`}
                  primaryTypographyProps={{ fontWeight: 700, fontSize: "1rem" }}
                  secondaryTypographyProps={{
                    color: "text.secondary",
                    fontSize: "0.875rem",
                    lineHeight: 1.4,
                  }}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <StatusChip label={entry.status} />
                  <ChevronRightRoundedIcon sx={{ color: "text.secondary" }} />
                </Stack>
              </ListItemButton>
              {index < entries.length - 1 ? <Divider /> : null}
            </div>
          ))}
        </List>
      </Stack>
    </Panel>
  );
};

export default EntriesCard;
