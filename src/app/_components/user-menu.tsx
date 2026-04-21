"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/app/_lib/auth-client";
import {
  CodeBracketIcon,
  FileTextIcon,
  LayoutIcon,
  LogoutIcon,
  SettingsIcon,
  UserIcon,
} from "./icons";

export function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isPending || !session) {
    return (
      <Link
        className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-[0.92rem] font-semibold text-slate-600 shadow-sm transition hover:border-black/20 hover:bg-slate-50 hover:text-slate-950"
        href="/account"
      >
        Sign in
      </Link>
    );
  }

  const { user } = session;
  const initials = user.name
    ? user.name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user.email || "T").trim().slice(0, 1).toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-label="User menu"
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white shadow-sm transition hover:border-black/20 hover:bg-slate-50"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {initials ? (
          <span className="text-[0.85rem] font-black text-slate-700">{initials}</span>
        ) : (
          <UserIcon className="h-5 w-5 text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[60] mt-2 w-60 origin-top-right rounded-2xl border border-black/8 bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          <div className="mb-1 border-b border-black/5 px-3 py-2">
            <p className="truncate text-sm font-bold text-slate-950">{user.name}</p>
            <p className="truncate text-xs font-medium text-slate-500">{user.email}</p>
          </div>

          <MenuGroup>
            <UserMenuLink
              href="/account/resumes"
              icon={<LayoutIcon className="h-4 w-4" />}
              label="My CVs"
              onNavigate={() => setIsOpen(false)}
            />
            <UserMenuLink
              href="/account"
              icon={<SettingsIcon className="h-4 w-4" />}
              label="Account settings"
              onNavigate={() => setIsOpen(false)}
            />
          </MenuGroup>

          <MenuDivider />

          <MenuGroup>
            <UserMenuLink
              href="/documentation"
              icon={<FileTextIcon className="h-4 w-4" />}
              label="Documentation"
              onNavigate={() => setIsOpen(false)}
            />
            <UserMenuLink
              href="/documentation#api-reference"
              icon={<CodeBracketIcon className="h-4 w-4" />}
              label="API reference"
              onNavigate={() => setIsOpen(false)}
            />
          </MenuGroup>

          <MenuDivider />

          <button
            className="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
            onClick={handleSignOut}
            type="button"
          >
            <LogoutIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

function MenuDivider() {
  return <div className="my-1 h-px bg-black/5" />;
}

function UserMenuLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      className="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
      href={href}
      onClick={onNavigate}
    >
      {icon}
      {label}
    </Link>
  );
}
