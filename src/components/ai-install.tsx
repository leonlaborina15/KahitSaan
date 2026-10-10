"use client";

import { MapPin } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-data";
import { useAiStatus } from "@/components/ai-status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MODELS, hasWebGPU, loadModel } from "@/lib/ai/llm";
import { catalog } from "@/lib/catalog";

const LATER_KEY = "ai_prompt_later";

/**
 * 1. Asks to install the mini AI (once per session until answered).
 * 2. When the install finishes, says it's ready and asks which part of Cabanatuan you're near
 *    (the data only covers Cabanatuan, so we use landmarks instead of GPS).
 */
export function AiInstallPrompt() {
  const ai = useAiStatus();
  const { place, pickPlace } = useApp();
  const [ask, setAsk] = useState(false);
  const [done, setDone] = useState(false);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (ai.state === "loading") wasLoading.current = true;
    if (ai.state === "ready" && wasLoading.current) {
      wasLoading.current = false;
      setDone(true);
    }
    if (ai.state !== "basic" || ai.reason !== "not-downloaded" || !hasWebGPU()) return setAsk(false);
    try {
      if (sessionStorage.getItem(LATER_KEY)) return;
    } catch {}
    // Give the cache check a moment: an AI installed before loads by itself.
    const t = setTimeout(() => setAsk(true), 1500);
    return () => clearTimeout(t);
  }, [ai]);

  const later = () => {
    try {
      sessionStorage.setItem(LATER_KEY, "1");
    } catch {}
    setAsk(false);
  };
  const install = (size: "small" | "big") => {
    setAsk(false);
    void loadModel(size);
  };

  return (
    <>
      <Dialog open={ask} onOpenChange={(o) => !o && later()}>
        <DialogContent className="max-w-[360px] rounded-[20px]">
          <DialogHeader>
            <DialogTitle>I-install ang mini AI?</DialogTitle>
            <DialogDescription>
              Para mas maintindihan ka ng app at may paliwanag ang bawat pick. Isang download lang, tapos gagana kahit walang internet. Mas
              mainam kung naka-Wi-Fi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="h-11 w-full" onClick={() => install("small")}>
              I-install ({MODELS.small.size})
            </Button>
            <Button variant="outline" className="h-11 w-full" onClick={() => install("big")}>
              Mas matalinong AI ({MODELS.big.size})
            </Button>
            <Button variant="ghost" className="h-11 w-full" onClick={later}>
              Mamaya na
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={done} onOpenChange={setDone}>
        <DialogContent className="max-w-[360px] rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Handa na ang AI!</DialogTitle>
            <DialogDescription>
              Alam ko ang mga kainan sa Cabanatuan City. Saan ka malapit? Dito ako hahanap ng pinakamagandang kainan para sa&apos;yo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto">
            {catalog.landmarks.map((l) => {
              const on = place?.label === l.name;
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] border px-4 text-left text-body ${on ? "border-brand bg-primary-soft" : "bg-card"}`}
                  onClick={() => {
                    pickPlace({ lat: l.lat, lng: l.lng, label: l.name, source: "landmark" });
                    setDone(false);
                  }}
                >
                  <MapPin size={20} weight="duotone" className="text-brand" aria-hidden /> {l.name}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
