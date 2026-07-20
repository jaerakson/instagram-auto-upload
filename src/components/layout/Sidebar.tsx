'use client';

import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  BarChart3,
  Settings,
  Menu,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';

const navItems = [
  { key: 'dashboard' as const, href: '/', icon: LayoutDashboard },
  { key: 'create' as const, href: '/create', icon: PlusCircle },
  { key: 'history' as const, href: '/history', icon: Clock },
  { key: 'analytics' as const, href: '/analytics', icon: BarChart3 },
  { key: 'settings' as const, href: '/settings', icon: Settings },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ key, href, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <a
            key={key}
            href={href}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(key)}
          </a>
        );
      })}
    </nav>
  );
}

function LanguageSwitch() {
  const serverLocale = useLocale() as 'ko' | 'en';
  const [current, setCurrent] = useState<'ko' | 'en'>(serverLocale);

  function switchLocale(locale: 'ko' | 'en') {
    if (locale === current) return;
    setCurrent(locale);
    // 브라우저 쿠키를 직접 설정하여 즉시 반영 보장
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div className="flex rounded-lg bg-slate-800 p-0.5">
      <button
        onClick={() => switchLocale('ko')}
        className={cn(
          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
          current === 'ko'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
            : 'text-slate-400 hover:text-slate-200'
        )}
      >
        KR
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={cn(
          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
          current === 'en'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
            : 'text-slate-400 hover:text-slate-200'
        )}
      >
        EN
      </button>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
          <Camera className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">
          Insta Auto Upload
        </span>
      </div>

      <div className="flex-1 px-3 py-2">
        <NavLinks onClick={onNavigate} />
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <LanguageSwitch />
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-slate-800 md:bg-slate-900">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-md md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="text-slate-300" />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 bg-slate-900 p-0 border-slate-800">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="ml-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
            <Camera className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Insta Auto Upload</span>
        </div>
      </div>
    </>
  );
}
