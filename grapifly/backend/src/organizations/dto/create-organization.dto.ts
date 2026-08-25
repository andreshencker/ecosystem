export interface CreateOrganizationDto {
  name: string;
  entityType?: 'company' | 'individual';
  /** Email of the Grapifly user who becomes this organization's owner (gets the 'owner' membership). */
  ownerEmail: string;
}
