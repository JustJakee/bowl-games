import { Box, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import { evaluatePasswordRequirements } from "./passwordPolicy.js";

const PasswordRequirementsChecklist = ({ password = "", sx }) => {
  const requirements = evaluatePasswordRequirements(password);

  return (
    <Box
      component="section"
      aria-label="Password requirements"
      sx={{ px: 0.25, ...sx }}
    >
      <Typography
        variant="caption"
        component="h3"
        color="text.secondary"
        sx={{ mb: 0.75, fontWeight: 700, letterSpacing: "0.02em" }}
      >
        Password requirements
      </Typography>
      <Stack
        component="ul"
        spacing={0.5}
        sx={{ p: 0, m: 0, listStyle: "none" }}
      >
        {requirements.map((requirement) => (
          <Stack
            component="li"
            direction="row"
            spacing={0.75}
            alignItems="center"
            key={requirement.id}
            aria-label={`${requirement.label}: ${
              requirement.satisfied ? "met" : "not met"
            }`}
          >
            {requirement.satisfied ? (
              <CheckCircleRoundedIcon
                aria-hidden="true"
                color="success"
                sx={{ fontSize: 16, flex: "0 0 auto" }}
              />
            ) : (
              <RadioButtonUncheckedRoundedIcon
                aria-hidden="true"
                sx={{
                  color: "text.secondary",
                  fontSize: 16,
                  flex: "0 0 auto",
                }}
              />
            )}
            <Typography
              variant="caption"
              color={
                requirement.satisfied ? "text.primary" : "text.secondary"
              }
              sx={{ lineHeight: 1.35 }}
            >
              {requirement.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default PasswordRequirementsChecklist;
