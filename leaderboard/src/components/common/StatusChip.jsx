import { Chip } from "@mui/material";

const statusColorMap = {
  Submitted: "success",
  "In Progress": "warning",
  Final: "default",
  Upcoming: "info",
};

const StatusChip = ({ label, ...props }) => {
  return <Chip size="small" label={label} color={statusColorMap[label] || "default"} {...props} />;
};

export default StatusChip;
