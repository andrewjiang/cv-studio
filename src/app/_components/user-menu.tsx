"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/app/_lib/auth-client";
import {
  CreditCardIcon,
  FileTextIcon,
  GlobeIcon,
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
        className="inline-flex items-center justify-center text-[0.92rem] font-semibold text-slate-600 transition hover:text-slate-950"
        href="/account"
      >
        Sign in
      </Link>
    );
  }

  const { user } = session;
  const avatarInitial = (user.name || user.email || "T").trim().slice(0, 1).toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition hover:bg-slate-50 overflow-hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        {avatarInitial ? (
          <span className="text-[0.78rem] font-black text-slate-700">{avatarInitial}</span>
        ) : (
          <UserIcon className="h-5 w-5 text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-black/8 bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.12)] ring-1 ring-black/5 z-[60]">
          <div className="px-3 py-2 border-b border-black/5 mb-1">
            <p className="text-sm font-bold text-slate-950 truncate">{user.name}</p>
            <p className="text-xs font-medium text-slate-500 truncate">{user.email}</p>
          </div>
          
          <Link
            className="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href="/account"
            onClick={() => setIsOpen(false)}
          >
            <LayoutIcon className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            className="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href="/account#resumes"
            onClick={() => setIsOpen(false)}
          >
            <FileTextIcon className="h-4 w-4" />
            My resumes
          </Link>

          <Link
            className="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href="/account#publishing"
            onClick={() => setIsOpen(false)}
          >
            <GlobeIcon className="h-4 w-4" />
            Publishing
          </Link>

          <Link
            className="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href="/account#billing"
            onClick={() => setIsOpen(false)}
          >
            <CreditCardIcon className="h-4 w-4" />
            Billing
          </Link>

          <Link
            className="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            href="/account#settings"
            onClick={() => setIsOpen(false)}
          >
            <SettingsIcon className="h-4 w-4" />
            Settings
          </Link>

          <button
            className="mt-1 flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
            onClick={handleSignOut}
          >
            <LogoutIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
