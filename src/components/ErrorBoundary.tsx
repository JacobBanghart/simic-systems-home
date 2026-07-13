import { Component, type ReactNode } from "react";
import { Typography, Box, Button } from "@mui/material";
import { getPostHog } from "../lib/posthog-client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("React error boundary caught:", error, info.componentStack);
    // Mirrors the server_error event middleware.ts captures for uncaught
    // exceptions server-side — without this, a React render crash was only
    // visible by a user manually opening devtools.
    getPostHog()?.capture("client_error", {
      message: error.message,
      component_stack: info.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Please try refreshing the page.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ textTransform: "none" }}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
