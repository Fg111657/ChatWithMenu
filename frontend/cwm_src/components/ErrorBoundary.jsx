import React from 'react';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ mb: 3 }}>
              <ErrorOutlineIcon
                sx={{ fontSize: 80, color: 'error.main', mb: 2 }}
              />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Oops! Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                We encountered an unexpected error. Please try refreshing the page.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
              >
                Refresh Page
              </Button>
            </Box>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  mt: 4,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  textAlign: 'left',
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
