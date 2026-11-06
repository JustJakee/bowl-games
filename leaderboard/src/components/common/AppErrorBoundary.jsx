import { Component } from "react";
import { Box, Button, Typography } from "@mui/material";

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box sx={{ maxWidth: 480, mx: "auto", p: 3, mt: 4 }} role="alert">
        <Typography variant="h5">The app could not load this screen</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          Check your connection and try again.
        </Typography>
        <Button variant="contained" onClick={() => this.setState({ hasError: false })}>
          Try again
        </Button>
      </Box>
    );
  }
}
