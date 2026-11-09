import { http } from '../api/http';
import type { Credentials, Tokens, Me } from '../types/auth';
let access: string | undefined;
export const auth = {
  async signIn(values: Credentials, register: boolean) {
    const tokens = await http<Tokens>(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(values) });
    access = tokens.accessToken;
    return http<Me>('/auth/me', {}, access);
  },
};
