import { useEffect, useState } from 'react';
import { useActStore } from '../../store/actStore';
import { useAppStore } from '../../store/store';

type Step = 'idle' | 'ring' | 'homeowner' | 'vendor' | 'review' | 'saved';

export function LaundryDoorbellDemo() {
  const [step, setStep] = useState<Step>('idle');

  const begin = () => {
    useActStore.getState().goToAct('freeplay');
    useActStore.getState().closeLens();
    useAppStore.getState().setActiveRoom('hallway');
    setStep('ring');
  };
  const close = () => setStep('idle');
  useEffect(() => {
    const onDoorbell = () => begin();
    window.addEventListener('hearth:laundry-doorbell', onDoorbell);
    return () => window.removeEventListener('hearth:laundry-doorbell', onDoorbell);
  });

  return (
    <>
      {step !== 'idle' && (
        <section className="fixed inset-0 z-[80] pointer-events-none flex items-end justify-center p-6 md:items-center">
          <div className="pointer-events-auto w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[#00caff]/30 bg-[#121110]/95 shadow-[0_24px_72px_rgba(0,0,0,0.7)]">
            <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0c222d] text-lg">🔔</span><div><p className="text-sm font-semibold text-[#f2ede6]">Ring · Front entrance</p><p className="text-[9px] font-mono tracking-[0.14em] text-[#8edfff]">PRESENCE DETECTED</p></div></div>
              <button type="button" onClick={close} className="text-white/50 hover:text-white">✕</button>
            </header>
            <div className="space-y-4 p-5 text-[16px] leading-relaxed text-[#f2ede6]">
              {step === 'ring' && <><div className="rounded-2xl border border-[#00caff]/20 bg-[#10242d] p-4">Doorbell rang. Laundry vendor may be here.</div><button type="button" onClick={() => setStep('homeowner')} className="rounded-full border border-[#c08662]/45 bg-[#c08662]/15 px-4 py-2 text-[11px] font-mono font-bold text-[#f0dac9]">OPEN CONVERSATION</button></>}
              {step === 'homeowner' && <><p className="text-[10px] font-mono tracking-[0.15em] text-white/40">HOMEOWNER</p><div className="w-fit rounded-2xl rounded-bl-sm bg-[#211b16] px-4 py-3">How many clothes are there today?</div><button type="button" onClick={() => setStep('vendor')} className="text-[11px] font-mono text-[#e8b368]">SHOW VENDOR REPLY →</button></>}
              {step === 'vendor' && <><p className="text-[10px] font-mono tracking-[0.15em] text-white/40">LAUNDRY VENDOR</p><div className="w-fit rounded-2xl rounded-bl-sm bg-[#211b16] px-4 py-3">Eight shirts, three trousers, and two bedsheets. It will be ₹420, returned by Friday evening.</div><p className="text-[11px] font-mono text-[#8edfff]">Alexa drafting record silently…</p><button type="button" onClick={() => setStep('review')} className="text-[11px] font-mono text-[#e8b368]">REVIEW DRAFT →</button></>}
              {step === 'review' && <><div className="rounded-2xl border border-[#d99a44]/25 bg-[#211b16] p-4"><p className="mb-3 text-[10px] font-mono tracking-[0.15em] text-[#e8b368]">LAUNDRY DRAFT</p><div className="grid grid-cols-2 gap-y-1 text-sm"><span>Shirts</span><b>8</b><span>Trousers</span><b>3</b><span>Bedsheets</span><b>2</b><span>Amount</span><b>₹420</b><span>Return</span><b>Friday · 6 PM</b></div></div><div className="rounded-2xl rounded-br-sm bg-[#10242d] px-4 py-3">I drafted the laundry record. Would you like me to confirm it?</div><div className="flex gap-2"><button type="button" onClick={() => setStep('saved')} className="rounded-full bg-[#c08662]/20 px-4 py-2 text-[11px] font-mono font-bold text-[#f0dac9]">CONFIRM</button><button type="button" onClick={close} className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-mono text-white/60">IGNORE</button></div></>}
              {step === 'saved' && <><div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-emerald-100">Laundry record saved. 13 items · ₹420 · Return Friday, 6 PM.</div><button type="button" onClick={close} className="text-[11px] font-mono text-[#e8b368]">DONE</button></>}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
