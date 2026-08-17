import { OrganizationsService } from './organizations.service';
export declare class RelayOrganizationController {
    private readonly organizations;
    constructor(organizations: OrganizationsService);
    getOrganization(secret: string | undefined, actorUserId: string, organizationId: string): Promise<{
        contractVersion: number;
        organization: import("mongoose").Document<unknown, {}, import("./schemas/organization.schema").Organization, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization.schema").Organization & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    updateOrganization(secret: string | undefined, actorUserId: string, organizationId: string, body: Record<string, unknown>): Promise<{
        contractVersion: number;
        organization: (import("mongoose").Document<unknown, {}, import("./schemas/organization.schema").Organization, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization.schema").Organization & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>) | null;
    }>;
}
