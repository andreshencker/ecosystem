import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignContractDto {
  @ApiProperty({ description: 'Contract MongoDB ObjectId to assign to this shift' })
  @IsMongoId({ message: 'contractId must be a valid MongoDB ObjectId' })
  contractId!: string;
}
