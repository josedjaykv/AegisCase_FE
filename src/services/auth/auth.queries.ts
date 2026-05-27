import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './auth.api';
import type { LoginInput } from './auth.types';

export const authQueryKeys = {
  me: ['auth', 'me'] as const,
};

export function useLoginMutation() {
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refreshToken: string) => authApi.logout(refreshToken),
    onSettled: () => {
      qc.clear();
    },
  });
}
