import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { usersApi } from './users.api';
import { usersQueryKeys } from './users.queryKeys';
import type {
  CreateUserInput,
  UpdateUserInput,
  UsersListParams,
} from './users.types';

const FIVE_MIN = 1000 * 60 * 5;
const TEN_MIN = 1000 * 60 * 10;

export function useUsersListQuery(params: UsersListParams) {
  return useQuery({
    queryKey: usersQueryKeys.list(params),
    queryFn: () => usersApi.list(params),
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    placeholderData: keepPreviousData,
  });
}

export function useUserQuery(id: string | undefined) {
  return useQuery({
    queryKey: usersQueryKeys.detail(id ?? ''),
    queryFn: () => usersApi.getById(id as string),
    enabled: !!id,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
  });
}

export function useCreateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: usersQueryKeys.lists() });
      qc.setQueryData(usersQueryKeys.detail(user.id), user);
    },
  });
}

export function useUpdateUserMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => usersApi.update(id, input),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: usersQueryKeys.lists() });
      qc.setQueryData(usersQueryKeys.detail(id), user);
    },
  });
}
