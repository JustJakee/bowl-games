import { Divider, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import Panel from "../common/Panel";
import SectionHeader from "./SectionHeader";
import StatusChip from "../common/StatusChip";

const EntriesCard = ({ entries }) => {
  return (
    <Panel sx={{ height: "100%" }}>
      <Stack spacing={1.5}>
        <SectionHeader title="My Entries" actionLabel="View All Entries" actionTo="/entries" />
        <List disablePadding>
          {entries.map((entry, index) => (
            <div key={entry.id}>
              <ListItemButton sx={{ px: 0, py: 1.25, borderRadius: 2 }}>
                <ListItemText
                  primary={entry.name}
                  secondary={`${entry.completedPicks} / ${entry.totalPicks} complete`}
                  primaryTypographyProps={{ fontWeight: 700 }}
                  secondaryTypographyProps={{ color: "text.secondary" }}
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
