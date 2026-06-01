import {
  Briefcase,
  ClipboardList,
  FileSearch,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Palette,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/auth/permissions';

export interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  roles: readonly Role[];
  devOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, roles: ['ADMIN', 'DETECTIVE', 'ANALYST'] },
  { to: '/cases', label: 'Cases', Icon: Briefcase, roles: ['ADMIN', 'DETECTIVE', 'ANALYST'] },
  { to: '/tasks', label: 'Tasks', Icon: ClipboardList, roles: ['ADMIN', 'DETECTIVE', 'ANALYST'] },
  { to: '/evidence', label: 'Evidence', Icon: FileSearch, roles: ['ADMIN', 'DETECTIVE', 'ANALYST'] },
  { to: '/involved', label: 'Involved', Icon: UsersRound, roles: ['ADMIN', 'DETECTIVE', 'ANALYST'] },
  { to: '/media', label: 'Media', Icon: ImageIcon, roles: ['ADMIN', 'DETECTIVE', 'ANALYST'] },
  { to: '/audit', label: 'Audit', Icon: History, roles: ['ADMIN'] },
  { to: '/users', label: 'Users', Icon: Users, roles: ['ADMIN'] },
  {
    to: '/styleguide',
    label: 'Styleguide',
    Icon: Palette,
    roles: ['ADMIN', 'DETECTIVE', 'ANALYST'],
    devOnly: true,
  },
];
