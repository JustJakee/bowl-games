import { Typography } from "@mui/material";

const VersusBadge = ({ label = "VS" }) => (
  <div className="versus-badge">
    <Typography variant="button" fontWeight={700}>
      {label}
    </Typography>
  </div>
);

export default VersusBadge;
