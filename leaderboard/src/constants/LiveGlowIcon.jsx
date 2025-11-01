// Exportable live icon that has a glow/animation
import CircleIcon from "@mui/icons-material/Circle";
import { keyframes } from "@emotion/react";

const glow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.6); }
  70% { box-shadow: 0 0 0 6px rgba(255, 0, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
`;

export default function LiveGlowIcon({ className }) {
  return (
    <CircleIcon
      className={className}
      sx={{
        color: "red",
        fontSize: 12,
        borderRadius: "50%",
        animation: `${glow} 1.5s infinite`,
      }}
    />
  );
}
