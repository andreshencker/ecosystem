import { HydratedDocument } from 'mongoose';
import type { UserRole } from '../../users/schemas/user.schema';
export type InvitationStatus = 'pending' | 'pending_delivery' | 'accepted' | 'expired' | 'cancelled';
export type InvitationScope = 'platform' | 'company';
export type InvitationDocument = HydratedDocument<Invitation> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class Invitation {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    companyId: string | null;
    businessKey: string | null;
    tokenHash: string;
    expiresAt: Date;
    status: InvitationStatus;
    userId: string | null;
    invitedByUserId: string | null;
    invitationScope: InvitationScope;
    senderCredentialScope: InvitationScope;
}
export declare const InvitationSchema: import("mongoose").Schema<Invitation, import("mongoose").Model<Invitation, any, any, any, any, any, Invitation>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    email?: import("mongoose").SchemaDefinitionProperty<string, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    firstName?: import("mongoose").SchemaDefinitionProperty<string, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastName?: import("mongoose").SchemaDefinitionProperty<string, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<UserRole, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    companyId?: import("mongoose").SchemaDefinitionProperty<string | null, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    businessKey?: import("mongoose").SchemaDefinitionProperty<string | null, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tokenHash?: import("mongoose").SchemaDefinitionProperty<string, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<InvitationStatus, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string | null, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    invitedByUserId?: import("mongoose").SchemaDefinitionProperty<string | null, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    invitationScope?: import("mongoose").SchemaDefinitionProperty<InvitationScope, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    senderCredentialScope?: import("mongoose").SchemaDefinitionProperty<InvitationScope, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Invitation>;
