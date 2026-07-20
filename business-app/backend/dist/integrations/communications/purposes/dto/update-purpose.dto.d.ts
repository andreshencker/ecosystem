import { ChannelToUseInputDto } from './create-purpose.dto';
export declare class UpdatePurposeDto {
    displayName?: string;
    domainCategory?: string;
    isActive?: boolean;
    channelsToUse?: ChannelToUseInputDto[];
}
