import { IntegrationPage } from '@/components/integrations/IntegrationPage';

export default function CommunicationsSettingsPage() {
  return (
    <IntegrationPage
      provider="communications"
      title="Communications"
      description="Connect Business App to Communications App to enable email, SMS and notification delivery."
    />
  );
}
