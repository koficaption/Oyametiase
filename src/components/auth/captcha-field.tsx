"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => number;
      reset: (id?: number) => void;
    };
  }
}

export function CaptchaField({ error }: { error?: string }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  const hostRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const widgetId = useRef<number | null>(null);

  useEffect(() => {
    if (!siteKey || !hostRef.current) return;

    const setToken = (value: string) => {
      if (tokenRef.current) tokenRef.current.value = value;
    };

    const renderWidget = () => {
      if (!hostRef.current || !window.grecaptcha || widgetId.current !== null) return;
      widgetId.current = window.grecaptcha.render(hostRef.current, {
        sitekey: siteKey,
        callback: setToken,
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-recaptcha='v2']");
    if (window.grecaptcha) {
      window.grecaptcha.ready(renderWidget);
      return;
    }
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.recaptcha = "v2";
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => window.grecaptcha?.ready(renderWidget));
    return () => {
      script.removeEventListener("load", renderWidget);
    };
  }, [siteKey]);

  if (!siteKey) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        The I&apos;m not a robot check is missing its public site key, so new accounts cannot be created yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-base font-semibold text-cop-navy">I&apos;m not a robot</p>
      <input type="hidden" name="captcha_token" ref={tokenRef} defaultValue="" />
      <div ref={hostRef} className="min-h-[78px]" />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
