import { IntegrationPage } from '@/components/integrations/IntegrationPage';

export default function CommunicationsSettingsPage() {
  return (
    <IntegrationPage
      // Kept as 'communications' — matches the persisted IntegrationConnection.provider
      // value in MongoDB. See relay-connection.controller.ts PROVIDER comment.
      provider="communications"
      title="Relay"
      description="Connect Business App to Relay to enable email, SMS and notification delivery."
    />
  );
}
