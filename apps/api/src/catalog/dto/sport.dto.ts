import { ApiProperty } from '@nestjs/swagger';

export class SportDto {
  @ApiProperty({ example: 'yoga' })
  slug: string;

  @ApiProperty({ example: 'Йога' })
  name: string;

  @ApiProperty({ description: 'lucide-react icon name', example: 'flower-2' })
  icon: string;

  @ApiProperty({ type: String, nullable: true, description: 'Cover photo URL' })
  photoUrl: string | null;
}
