import { IsArray, IsInt, IsOptional, Max, Min } from 'class-validator';

/** Auxiliary UX state only. Never the source of truth for step completion. */
export class UpdateOnboardingProgressDto {
  @IsOptional() @IsInt() @Min(1) @Max(9) currentStep?: number;

  @IsOptional() @IsArray() @IsInt({ each: true }) visitedSteps?: number[];
}
