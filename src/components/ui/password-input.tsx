"use client";

import { useRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({
  className,
  defaultValue,
  value: valueProp,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const [inner, setInner] = useState(() => (defaultValue == null ? "" : String(defaultValue)));
  const inputRef = useRef<HTMLInputElement>(null);
  const value = valueProp !== undefined ? valueProp : inner;

  function toggleVisible() {
    const typed = inputRef.current?.value ?? String(value ?? "");
    if (valueProp === undefined) setInner(typed);
    setVisible((open) => !open);
    queueMicrotask(() => {
      const field = inputRef.current;
      if (!field) return;
      if (field.value !== typed) {
        field.value = typed;
        if (valueProp === undefined) setInner(typed);
      }
      field.focus();
      try {
        field.setSelectionRange(typed.length, typed.length);
      } catch {
        /* password fields in some browsers reject selection */
      }
    });
  }

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        type={visible ? "text" : "password"}
        value={value}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="none"
        className={cn("pr-12", className)}
        onChange={(event) => {
          if (valueProp === undefined) setInner(event.target.value);
          onChange?.(event);
        }}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center text-cop-navy/70 touch-manipulation"
        onClick={toggleVisible}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}
