const fs = require('fs');
const path = './src/admin-clients/dto/admin-client.dto.ts';
let content = fs.readFileSync(path, 'utf8');

const insertion = `
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'name', 'environment', 'status', 'lastUsedAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
`;

content = content.replace(/environment\?: ApiTokenEnvironment;\n\}/, 'environment\?: ApiTokenEnvironment;\n' + insertion + '}');
fs.writeFileSync(path, content);
