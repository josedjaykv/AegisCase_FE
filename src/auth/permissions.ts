export const ROLES = ['ADMIN', 'DETECTIVE', 'ANALYST'] as const;
export type Role = (typeof ROLES)[number];

export type PermissionAction =
  | 'user.create'
  | 'user.list'
  | 'user.read'
  | 'user.update'
  | 'case.create'
  | 'case.read'
  | 'case.update'
  | 'case.changeStatus'
  | 'case.reopen'
  | 'case.archive'
  | 'case.team.add'
  | 'case.team.updateRole'
  | 'case.team.read'
  | 'involved.create'
  | 'involved.read'
  | 'involved.update'
  | 'involved.linkToCase'
  | 'evidence.create'
  | 'evidence.read'
  | 'evidence.update'
  | 'evidence.transferCustody'
  | 'evidence.archive'
  | 'task.create'
  | 'task.read'
  | 'task.update'
  | 'task.changeStatus'
  | 'task.cancel'
  | 'media.upload'
  | 'media.read'
  | 'media.delete'
  | 'audit.read';

export const PERMISSIONS: Record<PermissionAction, readonly Role[]> = {
  'user.create': ['ADMIN'],
  'user.list': ['ADMIN'],
  'user.read': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'user.update': ['ADMIN'],

  'case.create': ['ADMIN', 'DETECTIVE'],
  'case.read': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'case.update': ['ADMIN', 'DETECTIVE'],
  'case.changeStatus': ['ADMIN', 'DETECTIVE'],
  'case.reopen': ['ADMIN'],
  'case.archive': ['ADMIN'],
  'case.team.add': ['ADMIN', 'DETECTIVE'],
  'case.team.updateRole': ['ADMIN', 'DETECTIVE'],
  'case.team.read': ['ADMIN', 'DETECTIVE', 'ANALYST'],

  'involved.create': ['ADMIN', 'DETECTIVE'],
  'involved.read': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'involved.update': ['ADMIN', 'DETECTIVE'],
  'involved.linkToCase': ['ADMIN', 'DETECTIVE'],

  'evidence.create': ['ADMIN', 'DETECTIVE'],
  'evidence.read': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'evidence.update': ['ADMIN', 'DETECTIVE'],
  'evidence.transferCustody': ['ADMIN', 'DETECTIVE'],
  'evidence.archive': ['ADMIN'],

  'task.create': ['ADMIN', 'DETECTIVE'],
  'task.read': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'task.update': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'task.changeStatus': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'task.cancel': ['ADMIN', 'DETECTIVE'],

  'media.upload': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'media.read': ['ADMIN', 'DETECTIVE', 'ANALYST'],
  'media.delete': ['ADMIN'],

  'audit.read': ['ADMIN', 'DETECTIVE', 'ANALYST'],
};

export function roleCan(role: Role | null | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  return PERMISSIONS[action].includes(role);
}
