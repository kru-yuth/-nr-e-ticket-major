import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { EVENT, audienceLabel } from '../config';

export default function ETicketSuccess({ ticket, onDone }) {
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef(null);
  const seatsList = ticket.seats && ticket.seats.length
    ? ticket.seats
    : ticket.seatId
      ? [ticket.seatId]
      : [];
  const seatsText = seatsList.map((s) => String(s).replace('-', '')).join(', ');
  const qrValue = `NRE-TICKET|${ticket.ticketCode}|${seatsList.join('+')}|${ticket.name}`;

  async function handleDownload() {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#0b0514',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `ETicket-${ticket.ticketCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('download failed', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div
          ref={ticketRef}
          className="relative overflow-hidden rounded-3xl border-2 border-neon-pink/60 bg-gradient-to-br from-[#17071f] via-dark to-[#071622] p-6 shadow-neon-pink"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-neon-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.9)]">
                {EVENT.name}
              </h1>
              <p className="mt-0.5 text-[10px] tracking-wider text-white/60">{EVENT.festival}</p>
            </div>
            <span className="text-3xl drop-shadow-[0_0_10px_rgba(255,46,196,0.8)]">🎭</span>
          </div>

          <div className="my-4 border-t border-dashed border-white/20" />

          <div className="rounded-2xl border border-white/10 bg-white p-4">
            <div className="mb-3 flex justify-center">
              <QRCodeSVG value={qrValue} size={148} bgColor="#ffffff" fgColor="#0b0514" level="M" />
            </div>
            <p className="text-center text-[10px] text-gray-500">
              แคปหน้าจอไว้เพื่อใช้ยืนยันกับทีมงานหน้าประตู
            </p>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <InfoRow label="รหัสตั๋ว">
              <span className="font-mono font-bold text-neon-yellow drop-shadow-[0_0_6px_rgba(255,230,0,0.6)]">
                {ticket.ticketCode}
              </span>
            </InfoRow>
            <InfoRow label="ผู้จอง">
              <span className="text-right font-bold">{ticket.name}</span>
            </InfoRow>
            <InfoRow label="กลุ่มเป้าหมาย">{audienceLabel(ticket.audienceType)}</InfoRow>
            <InfoRow label="ที่นั่ง">
              <span className="text-lg font-extrabold text-neon-pink drop-shadow-[0_0_8px_rgba(255,46,196,0.8)]">
                {seatsText}
              </span>
            </InfoRow>
            <InfoRow label="วันที่">{ticket.showDate || EVENT.dates}</InfoRow>
            <InfoRow label="เวลา / สถานที่">
              <span className="text-right">{EVENT.time} · {EVENT.place}</span>
            </InfoRow>
            {EVENT.note && (
              <InfoRow label="หมายเหตุ">
                <span className="text-right text-neon-yellow">{EVENT.note}</span>
              </InfoRow>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 p-3 text-center text-xs text-neon-cyan">
            ✓ ยืนยันการจองสำเร็จ · ยื่นตั๋วนี้กับทีมงานเพื่อเช็กอินหน้างาน
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full rounded-xl bg-neon-cyan px-6 py-3 text-sm font-bold text-dark shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
          >
            {downloading ? 'กำลังสร้างภาพ...' : '⬇️ ดาวน์โหลดตั๋ว (Download E-Ticket)'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm text-white/80 transition hover:bg-white/10"
          >
            ← กลับไปหน้าจองที่นั่ง
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
      <span className="text-white/50">{label}</span>
      <span className="text-right text-white">{children}</span>
    </div>
  );
}
