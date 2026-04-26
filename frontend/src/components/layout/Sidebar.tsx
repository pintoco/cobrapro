'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, CreditCard,
  Bell, ChevronLeft, ChevronRight, DollarSign, LogOut,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { href: '/',             label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/clientes',     label: 'Clientes',        icon: Users           },
  { href: '/facturas',     label: 'Facturas',        icon: FileText        },
  { href: '/pagos',        label: 'Pagos',           icon: CreditCard      },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell           },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    toast.success('Sesión cerrada');
    router.replace('/login');
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-white/10', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">CobranzaPro</p>
            <p className="text-gray-400 text-xs truncate">{user?.company?.name ?? ''}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn('sidebar-link', active && 'active', collapsed && 'justify-center px-0')}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {getInitials(user.firstName, user.lastName)}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-gray-400 text-xs truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
            'text-gray-400 hover:text-white hover:bg-white/10 transition-colors',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && 'Cerrar sesión'}
        </button>

        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
            'text-gray-400 hover:text-white hover:bg-white/10 transition-colors',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
