import { InvitationResponseDto } from '../dto/invitation-response.dto';
export declare class InvitationMapper {
    static toResponse(doc: any): InvitationResponseDto;
    static toResponseList(docs: any[]): InvitationResponseDto[];
}
