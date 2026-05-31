import { IsString, IsUUID, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';

export class ChatRequestDto {
  @IsUUID('4')
  conversationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsEnum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'])
  preferredModel?: string;

  @IsOptional()
  @IsString()
  context?: string; // Additional context about user's portfolio or position

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string; // Current topic being discussed
}
