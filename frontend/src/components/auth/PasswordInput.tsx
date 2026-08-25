"use client";

import { useState, type ComponentPropsWithoutRef } from "react";

import { Icons } from "@/components/icons";
import { Input } from "@/components/ui";

export function PasswordInput(props: ComponentPropsWithoutRef<"input">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? Icons.conceal : Icons.reveal;

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ascunde parola" : "Arată parola"}
          className="-mr-1 rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </button>
      }
    />
  );
}
