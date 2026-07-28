"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PROCESSING_ATTRIBUTE = "data-processing";

function markProcessing(element: HTMLElement) {
  if (element.hasAttribute(PROCESSING_ATTRIBUTE)) return;
  element.setAttribute(PROCESSING_ATTRIBUTE, "true");
  element.setAttribute("aria-busy", "true");
  window.setTimeout(() => {
    if (!element.isConnected) return;
    element.removeAttribute(PROCESSING_ATTRIBUTE);
    element.removeAttribute("aria-busy");
  }, 15000);
}

function clearProcessing() {
  document.querySelectorAll<HTMLElement>(`[${PROCESSING_ATTRIBUTE}]`).forEach((element) => {
    element.removeAttribute(PROCESSING_ATTRIBUTE);
    element.removeAttribute("aria-busy");
  });
}

export function InteractionFeedback() {
  const pathname = usePathname();

  useEffect(() => clearProcessing(), [pathname]);

  useEffect(() => {
    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      if (event.submitter instanceof HTMLElement) markProcessing(event.submitter);
    };
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a, button[data-async-action]") : null;
      if (!(target instanceof HTMLElement)) return;
      if (target instanceof HTMLAnchorElement) {
        if (target.target === "_blank" || target.hasAttribute("download")) return;
        const destination = new URL(target.href, window.location.href);
        const samePageAnchor = destination.pathname === window.location.pathname && destination.search === window.location.search && Boolean(destination.hash);
        if (destination.origin !== window.location.origin || samePageAnchor) return;
      }
      markProcessing(target);
    };
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("click", handleClick);
    window.addEventListener("pageshow", clearProcessing);
    return () => {
      document.removeEventListener("submit", handleSubmit);
      document.removeEventListener("click", handleClick);
      window.removeEventListener("pageshow", clearProcessing);
    };
  }, []);

  return <span className="interaction-status" role="status" aria-live="polite">Processing…</span>;
}
