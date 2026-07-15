import { useEffect, useState } from 'react';
import { useActStore } from '../../store/actStore';
import { useAppStore } from '../../store/store';

export function FinanceReminderDemo() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  useEffect(() => {
    const show = () => {
      useActStore.getState().goToAct('freeplay');
      useActStore.getState().closeLens();
      useAppStore.getState().setActiveRoom('kitchen');
      setDetail(false); setOpen(true);
    };
    window.addEventListener('hearth:finance-summary', show);
    return () => window.removeEventListener('hearth:finance-summary', show);
  }, []);
  if (!open) return null;
  return <section className="fixed inset-0 z-[80] pointer-events-none flex items-end justify-center p-6 md:items-center"><div className="pointer-events-auto w-full max-w-[540px] overflow-hidden rounded-[28px] border border-[#d99a44]/30 bg-[#121110]/95 shadow-[0_24px_72px_rgba(0,0,0,.72)]">
    <header className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2a1e14] text-lg">₹</span><div><p className="text-sm font-semibold text-[#f2ede6]">Money snapshot</p><p className="text-[9px] font-mono tracking-[.14em] text-[#e8b368]">PERSONAL · DEMO DATA</p></div></div><button type="button" onClick={() => setOpen(false)} className="text-white/50 hover:text-white">✕</button></header>
    <div className="space-y-4 p-5 text-[16px] leading-relaxed text-[#f2ede6]">
      {!detail ? <><div className="rounded-2xl rounded-br-sm bg-[#10242d] px-4 py-3">Your home-loan EMI of ₹12,800 is due on 20 Jul. Want a complete payment snapshot?</div><button type="button" onClick={() => setDetail(true)} className="rounded-full border border-[#c08662]/45 bg-[#c08662]/15 px-4 py-2 text-[11px] font-mono font-bold text-[#f0dac9]">SHOW EMI PLAN</button></> : <><div className="rounded-2xl border border-[#d99a44]/35 bg-[#211b16] p-4"><p className="mb-3 text-[10px] font-mono tracking-[.15em] text-[#e8b368]">PRIMARY · EMI DUE</p><div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm"><span>Home-loan EMI · 20 Jul</span><b>₹12,800</b><span>Remaining this week</span><b>4 days</b></div></div><div className="rounded-2xl border border-white/[.1] bg-white/[.03] p-4"><p className="mb-3 text-[10px] font-mono tracking-[.15em] text-white/50">OTHER PAYMENTS</p><div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm"><span>Credit card bill · 22 Jul</span><b>₹8,450</b><span>Amazon Pay utilities</span><b>₹2,180</b><span>Subscriptions this month</span><b>₹880</b></div></div><div className="rounded-2xl rounded-br-sm bg-[#10242d] px-4 py-3">Suggestion: reserve ₹12,800 for your EMI first. Then pay the credit card in full before 22 Jul if cash flow permits; review subscriptions before renewal.</div><p className="text-[10px] font-mono text-white/35">INFORMATIONAL ONLY · CHECK BILLER STATEMENTS BEFORE PAYING</p></>}</div>
  </div></section>;
}
