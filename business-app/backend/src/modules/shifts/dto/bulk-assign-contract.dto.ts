import { IsArray, IsNotEmpty, IsString, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignmentPairDto {
  @IsString()
  @IsNotEmpty()
  shiftId!: string;

  @IsString()
  @IsNotEmpty()
  contractId!: string;
}

export class BulkAssignContractDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AssignmentPairDto)
  assignments!: AssignmentPairDto[];
}
