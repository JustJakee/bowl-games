// UI — PAYMENTS — PLAYER READ ONLY
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { Chip } from "@mui/material";

const PaymentStatusChip = ({ paymentStatus, sx, ...props }) => {
  const paid = String(paymentStatus || "").toUpperCase() === "PAID";

  return (
    <Chip
      size="small"
      icon={paid ? <CheckCircleRoundedIcon /> : <PaymentsOutlinedIcon />}
      label={paid ? "Paid" : "Payment Due"}
      color={paid ? "success" : "warning"}
      sx={{ fontWeight: 800, ...sx }}
      {...props}
    />
  );
};

export default PaymentStatusChip;
