import { Button, Divider, Stack, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";
import SectionHeader from "./SectionHeader";
import StatusChip from "../common/StatusChip";

const PickStatusCard = ({ data }) => {
  return (
    <Panel sx={{ height: "100%" }}>
      <Stack spacing={2}>
        <SectionHeader title="Your Pick Status" />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="subtitle1">{data.entryName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {data.completedPicks} / {data.totalPicks} picks completed
            </Typography>
          </div>
          <StatusChip label={data.status} />
        </Stack>
        <Divider />
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Tiebreaker
          </Typography>
          <Typography variant="subtitle2">{data.tiebreaker}</Typography>
        </Stack>
        <Button
          component={RouterLink}
          to="/picks"
          variant="outlined"
          endIcon={<ChevronRightRoundedIcon />}
        >
          Continue Picks
        </Button>
      </Stack>
    </Panel>
  );
};

export default PickStatusCard;
