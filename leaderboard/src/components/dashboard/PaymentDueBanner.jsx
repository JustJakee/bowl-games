import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Alert } from "@mui/material";
import { alpha } from "@mui/material/styles";

const PaymentDueBanner = ({ paymentState }) =>
  paymentState === "unpaid" ? (
    <Alert
      severity="warning"
      icon={<WarningAmberRoundedIcon fontSize="small" />}
      sx={{
        py: 0.25,
        px: { xs: 1, sm: 1.5 },
        alignItems: "center",
        color: "text.primary",
        backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.1),
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.45),
        "& .MuiAlert-icon": { color: "warning.main", py: 0.5 },
        "& .MuiAlert-message": { py: 0.5, fontWeight: 700 },
      }}
    >
      Your picks are currently unpaid, please pay Jake or Bob Koons
    </Alert>
  ) : null;

export default PaymentDueBanner;
