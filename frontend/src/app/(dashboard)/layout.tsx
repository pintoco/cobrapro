'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/auth.store';

const PAGE_TITLES: Record<string, string> = {
  '/':                   'Dashboard',
  '/clientes':           'Clientes',
  '/facturas':           'Facturas',
  '/pagos':              'Pagos',
  '/notificaciones':     'Notificaciones',
  '/importar':           'Importar',
  '/auditoria':          'Auditoría',
  '/suscripcion':        'Suscripción',
  '/admin/metricas':     'Métricas Globales',
  '/admin/empresas':     'Empresas',
  '/admin/planes':       'Planes SaaS',
};

const getPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/facturas/')) return 'Detalle de Factura';
  if (pathname.startsWith('/clientes/')) return 'Detalle de Cliente';
  return 'CobranzaPro';
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!Cookies.get('accessToken') && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated && !Cookies.get('accessToken')) return null;

  const title = getPageTitle(pathname);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header title={title} onMenuClick={() => setCollapsed(!collapsed)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
