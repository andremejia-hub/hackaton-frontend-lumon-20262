export interface Tokens { accessToken: string; refreshToken: string; expiresIn: number }
export interface Credentials { email: string; password: string; teamName?: string }
export interface Me { id: number; email: string; displayName: string; team: { code: string; name: string }; role: { code: string; name: string }; permissions: string[]; clearance: { granted: boolean; grantedAt: string | null } }
