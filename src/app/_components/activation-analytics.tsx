"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import type {
  ActivationEventMetadata,
  ActivationEventName,
} from "@/app/_lib/activation-events";
import { trackActivationEvent } from "@/app/_lib/activation-analytics-client";

export function ActivationEventOnMount({
  eventName,
  metadata,
  onceKey,
}: {
  eventName: ActivationEventName;
  metadata?: ActivationEventMetadata;
  onceKey?: string;
}) {
  useEffect(() => {
    trackActivationEvent(eventName, metadata, { onceKey });
  }, [eventName, metadata, onceKey]);

  return null;
}

export function ActivationLink({
  children,
  className,
  eventName,
  eventMetadata,
  href,
}: {
  children: ReactNode;
  className?: string;
  eventName: ActivationEventName;
  eventMetadata?: ActivationEventMetadata;
  href: string;
}) {
  return (
    <Link
      className={className}
      href={href}
      onClick={() => trackActivationEvent(eventName, eventMetadata)}
    >
      {children}
    </Link>
  );
}
