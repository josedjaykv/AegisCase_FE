import type { MediaEntityType } from './media.types';

export const mediaQueryKeys = {
  all: ['media'] as const,
  entity: (entityType: MediaEntityType, entityId: string) =>
    [...mediaQueryKeys.all, 'entity', entityType, entityId] as const,
};
