import { Button, Divider, Stack, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";
import SectionHeader from "./SectionHeader";
import StatusChip from "../common/StatusChip";

const PickStatusCard = ({ data }) => {
  if (!data) {
    return (
      <Panel sx={{ width: "100%", height: "100%" }}>
        <Stack spacing={1.5} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <SectionHeader title="Your Pick Status" />
          <Stack spacing={0.75}>
            <Typography variant="subtitle1" sx={{ fontSize: "1rem", fontWeight: 700 }}>
              No picks started
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem", lineHeight: 1.4 }}>
              Create an entry and save at least one winner to track your bowl picks here.
            </Typography>
          </Stack>
          <Divider />
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
              Tiebreaker
            </Typography>
            <Typography variant="subtitle2" sx={{ fontSize: "1rem", fontWeight: 700 }}>
              Not Set
            </Typography>
          </Stack>
          <Button
            component={RouterLink}
            to="/picks"
            variant="outlined"
            endIcon={<ChevronRightRoundedIcon />}
            sx={{ alignSelf: "flex-start", minHeight: 42, px: 2.5, mt: "auto" }}
          >
            Make Your Picks
          </Button>
        </Stack>
      </Panel>
    );
  }

  return (
    <Panel sx={{ width: "100%", height: "100%" }}>
      <Stack spacing={1.5} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <SectionHeader title="Your Pick Status" />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="subtitle1" sx={{ fontSize: "1rem", fontWeight: 700 }}>
              {data.entryName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem", lineHeight: 1.4 }}>
              {data.completedPicks} / {data.totalPicks} picks completed
            </Typography>
          </div>
          <StatusChip label={data.status} />
        </Stack>
        <Divider />
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            Tiebreaker
          </Typography>
          <Typography variant="subtitle2" sx={{ fontSize: "1rem", fontWeight: 700 }}>
            {data.tiebreaker}
          </Typography>
        </Stack>
        <Button
          component={RouterLink}
          to="/picks"
          variant="outlined"
          endIcon={<ChevronRightRoundedIcon />}
          sx={{ alignSelf: "flex-start", minHeight: 42, px: 2.5, mt: "auto" }}
        >
          {data.status === "Complete" ? "Review Picks" : "Continue Picks"}
        </Button>
      </Stack>
    </Panel>
  );
};

export default PickStatusCard;
