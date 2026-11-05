import { Box, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import { evaluateUsernameRequirements } from "./userProfile.js";

const UsernameRequirementsChecklist = ({ username = "" }) => {
  const requirements = evaluateUsernameRequirements(username);

  return (
    <Box component="section" aria-label="Username requirements">
      <Typography
        variant="caption"
        component="h3"
        color="text.secondary"
        sx={{ mb: 0.5, fontWeight: 700, letterSpacing: "0.02em" }}
      >
        Username requirements
      </Typography>
      <Stack
        component="ul"
        spacing={0.25}
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
                sx={{ fontSize: 15, flex: "0 0 auto" }}
              />
            ) : (
              <RadioButtonUncheckedRoundedIcon
                aria-hidden="true"
                sx={{
                  color: "text.secondary",
                  fontSize: 15,
                  flex: "0 0 auto",
                }}
              />
            )}
            <Typography
              variant="caption"
              color={requirement.satisfied ? "text.primary" : "text.secondary"}
              sx={{ lineHeight: 1.3 }}
            >
              {requirement.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default UsernameRequirementsChecklist;
