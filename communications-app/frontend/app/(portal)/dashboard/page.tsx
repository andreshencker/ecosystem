import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

const solutions = [
  { name: 'Email', description: 'Send through authorized providers.', icon: EmailOutlinedIcon, color: '#FFF0E5' },
  { name: 'Calendars', description: 'Read and synchronize events.', icon: CalendarMonthOutlinedIcon, color: '#E8F4FF' },
  { name: 'Payments', description: 'Connect secure payment providers.', icon: PaymentsOutlinedIcon, color: '#EAF8EE' },
  { name: 'Accounting', description: 'Move financial data with control.', icon: AccountBalanceOutlinedIcon, color: '#F0ECFF' },
];

export default function DashboardPage() {
  return (
    <Box maxWidth={1280} mx="auto">
      <Box sx={{ borderRadius: 5, p: { xs: 4, md: 7 }, color: '#fff', background: 'radial-gradient(circle at 85% 10%, rgba(255,255,255,.2), transparent 25%), linear-gradient(135deg,#111116 0%,#24202D 65%,#3A2857 100%)', overflow: 'hidden', position: 'relative' }}>
        <Chip label="RELAY BY GRAPIFLY" sx={{ bgcolor: 'rgba(255,255,255,.12)', color: '#FFB178', letterSpacing: '.08em', fontWeight: 700 }} />
        <Typography sx={{ mt: 3, fontSize: { xs: 42, md: 66 }, lineHeight: .98, letterSpacing: '-.06em', fontWeight: 720, maxWidth: 760 }}>Your services.<br />Working as one.</Typography>
        <Typography sx={{ mt: 3, maxWidth: 580, color: 'rgba(255,255,255,.62)', fontSize: 17, lineHeight: 1.55 }}>Connect providers, grant the permissions you choose and let Relay handle authorized actions across every solution.</Typography>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-end' }} mt={7} mb={3} gap={2}>
        <Box><Typography color="primary.main" fontWeight={700} fontSize={13}>YOUR SOLUTIONS</Typography><Typography sx={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.045em', mt: .5 }}>Everything you can connect.</Typography></Box>
        <Typography color="text.secondary" maxWidth={430}>Each solution solves a specific need and becomes more valuable when connected to your Grapifly ecosystem.</Typography>
      </Stack>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={2}>
        {solutions.map(({ name, description, icon: Icon, color }) => (
          <Card key={name} sx={{ p: 3, minHeight: 235, bgcolor: color, border: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ width: 50, height: 50, borderRadius: 3, bgcolor: 'rgba(255,255,255,.8)', display: 'grid', placeItems: 'center' }}><Icon /></Box>
            <Box mt="auto"><Typography sx={{ fontSize: 23, fontWeight: 700, letterSpacing: '-.03em' }}>{name}</Typography><Typography color="text.secondary" mt={.5}>{description}</Typography></Box>
            <ArrowForwardRoundedIcon sx={{ alignSelf: 'flex-end', mt: 2 }} />
          </Card>
        ))}
      </Box>
    </Box>
  );
}
