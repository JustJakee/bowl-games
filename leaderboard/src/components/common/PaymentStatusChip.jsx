// UI — PAYMENTS — PLAYER READ ONLY
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { Chip } from "@mui/material";
import { getDashboardPaymentState } from "../../utils/dashboardVisibility";

const PaymentStatusChip = ({ paymentStatus, sx, ...props }) => {
  const status = getDashboardPaymentState({ paymentStatus });
  const paid = status === "paid";
  const unpaid = status === "unpaid";

  return (
    <Chip
      size="small"
      icon={paid ? <CheckCircleRoundedIcon /> : unpaid ? <PaymentsOutlinedIcon /> : undefined}
      label={paid ? "Paid" : unpaid ? "Payment Due" : "Payment unavailable"}
      color={paid ? "success" : unpaid ? "warning" : "default"}
      sx={{ fontWeight: 800, ...sx }}
      {...props}
    />
  );
};

export default PaymentStatusChip;
