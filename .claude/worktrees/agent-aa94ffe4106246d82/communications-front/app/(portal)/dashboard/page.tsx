import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary">
        Welcome to the Communication Portal. Select a section from the sidebar to get started.
      </Typography>
    </Box>
  );
}
