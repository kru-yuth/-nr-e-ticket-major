import { useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db, isFirebaseConfigured } from './firebase';
import {
  DEFAULT_SHOW_DATE,
  SHOW_DATES,
  dateLabelOfKey,
  statusFieldFor,
  bookedByFieldFor,
  audienceFieldFor,
  bookedAtFieldFor,
  EVENT,
} from './config';
import SeatMap from './components/SeatMap';
import BookingModal from './components/BookingModal';
import ETicketSuccess from './components/ETicketSuccess';
import StaffDashboard from './components/StaffDashboard';
import InitDatabase from './components/InitDatabase';

function makeTicketCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `RT-${result}`;
}

function getSeatId(seat) {
  return seat.id || seat.seatId;
}

const TABS = [
  { id: 'seatmap', label: 'จองที่นั่ง', icon: '🎟️' },
  { id: 'staff', label: 'หลังบ้านทีมงาน', icon: '🛠️' },
  { id: 'init', label: 'ตั้งค่าระบบ', icon: '⚙️' },
];

export default function App() {
  const [view, setView] = useState('seatmap');
  const [selectedDate, setSelectedDate] = useState(DEFAULT_SHOW_DATE);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookError, setBookError] = useState(null);
  const [bookedTicket, setBookedTicket] = useState(null);

  const configured = isFirebaseConfigured();

  function changeView(next) {
    setView(next);
    setSelectedSeats([]);
    setBookingOpen(false);
    setBookError(null);
  }

  function toggleSeat(seat) {
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => getSeatId(s) === getSeatId(seat));
      if (exists) return prev.filter((s) => getSeatId(s) !== getSeatId(seat));
      return [...prev, seat];
    });
    setBookError(null);
  }

  async function handleBook({ name, email, phone, audienceType, showDateKey }) {
    if (!selectedSeats.length || !configured) return;
    const dateKey = showDateKey || selectedDate;
    const dateLabel = dateLabelOfKey(dateKey);
    const statusField = statusFieldFor(dateKey);
    const bookedByField = bookedByFieldFor(dateKey);
    const audienceField = audienceFieldFor(dateKey);
    const bookedAtField = bookedAtFieldFor(dateKey);
    const ticketCode = makeTicketCode();
    const seatIds = selectedSeats.map((s) => getSeatId(s));
    setSubmitting(true);
    setBookError(null);
    try {
      const ticketRef = doc(db, 'tickets', ticketCode);
      await runTransaction(db, async (txn) => {
        const snapshots = await Promise.all(
          seatIds.map((id) => txn.get(doc(db, 'seats', id))),
        );
        snapshots.forEach((snap, index) => {
          if (!snap.exists()) throw new Error('SEAT_NOT_FOUND');
          const data = snap.data();
          const current = data[statusField] || data.status;
          if (current !== 'available') throw new Error(`SEAT_TAKEN:${seatIds[index]}`);
        });
        const bookedAt = serverTimestamp();
        seatIds.forEach((id) => {
          txn.update(doc(db, 'seats', id), {
            [statusField]: 'booked',
            [bookedByField]: name,
            [audienceField]: audienceType,
            [bookedAtField]: bookedAt,
          });
        });
        txn.set(ticketRef, {
          ticketCode,
          name,
          email: email || '',
          phone,
          customerNameLower: name.toLowerCase(),
          audienceType,
          showDate: dateLabel,
          showDateKey: dateKey,
          seats: seatIds,
          zones: selectedSeats.map((s) => s.zone),
          isCheckedIn: false,
          createdAt: bookedAt,
        });
      });
      setBookedTicket({
        ticketCode,
        name,
        email: email || '',
        phone,
        audienceType,
        showDate: dateLabel,
        showDateKey: dateKey,
        seats: seatIds,
      });
      setSelectedSeats([]);
      setBookingOpen(false);

      if (email) {
        try {
          const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
          const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
          const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
          if (serviceId && templateId && publicKey) {
            const qrData = `NRE-TICKET|${ticketCode}|${seatIds.join('+')}|${name}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
              qrData,
            )}`;
            await emailjs.send(
              serviceId,
              templateId,
              {
                to_name: name,
                to_email: email,
                ticket_code: ticketCode,
                qr_url: qrUrl,
                seats: seatIds.join(', '),
                show_date: dateLabel,
              },
              { publicKey },
            );
          }
        } catch (err) {
          console.error('email send failed', err);
        }
      }
    } catch (err) {
      if (err.message && err.message.startsWith('SEAT_TAKEN')) {
        const takenId = err.message.split(':')[1];
        setSelectedSeats((prev) =>
          takenId ? prev.filter((s) => getSeatId(s) !== takenId) : prev,
        );
        setBookError(
          takenId
            ? `ขออภัย ที่นั่ง ${takenId} เพิ่งถูกจองไปแล้ว จึงถูกลบออกจากรายการ กรุณากดยืนยันอีกครั้ง`
            : 'ขออภัย ที่นั่งบางตัวเพิ่งถูกจองไปแล้ว กรุณาเลือกที่นั่งใหม่',
        );
      } else {
        console.error('booking failed', err);
        setBookError('เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (bookedTicket) {
    return <ETicketSuccess ticket={bookedTicket} onDone={() => setBookedTicket(null)} />;
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-dark/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl drop-shadow-[0_0_10px_rgba(255,46,196,0.9)]">🎭</span>
            <div>
              <h1 className="text-lg font-extrabold leading-tight text-neon-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]">
                {EVENT.name}
              </h1>
              <p className="text-[10px] text-white/60 sm:text-xs">{EVENT.festival}</p>
            </div>
          </div>
          <nav className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeView(tab.id)}
                className={`rounded-xl px-2 py-1.5 text-xs transition sm:px-3 sm:text-sm ${
                  view === tab.id
                    ? 'bg-neon-pink font-bold text-white shadow-neon-pink'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span className="mr-1 hidden sm:inline">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!configured && (
          <div className="mb-6 rounded-2xl border border-neon-yellow/40 bg-neon-yellow/10 p-4 text-sm text-neon-yellow">
            ⚠️ ยังไม่ได้ตั้งค่า Firebase กรุณากรอกค่าการเชื่อมต่อใน{' '}
            <code className="font-mono">src/firebase.js</code> หรือไฟล์ <code className="font-mono">.env</code> แล้วทำตามใน README.md
          </div>
        )}

        {view === 'seatmap' && (
          <>
            <div className="mb-6 rounded-2xl border border-neon-cyan/40 bg-white/5 p-4">
              <p className="mb-2 text-center text-xs tracking-wider text-white/50">
                STEP 1 · เลือกรอบวันแสดง (สถานะที่นั่งของแต่ละวันแยกจากกัน)
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SHOW_DATES.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.key);
                      setSelectedSeats([]);
                      setBookError(null);
                    }}
                    className={`rounded-xl border px-5 py-2.5 text-sm transition ${
                      selectedDate === d.key
                        ? 'border-neon-pink bg-neon-pink font-bold text-white shadow-neon-pink'
                        : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <SeatMap
              dateKey={selectedDate}
              selectedSeats={selectedSeats}
              onToggleSeat={toggleSeat}
              onClear={() => {
                setSelectedSeats([]);
                setBookError(null);
              }}
              onBook={() => {
                setBookingOpen(true);
                setBookError(null);
              }}
            />
          </>
        )}
        {view === 'staff' && <StaffDashboard />}
        {view === 'init' && <InitDatabase />}
      </main>

      {view === 'seatmap' && bookingOpen && (
        <BookingModal
          seats={selectedSeats}
          selectedDate={selectedDate}
          submitting={submitting}
          errorMessage={bookError}
          onClose={() => {
            setBookingOpen(false);
            setBookError(null);
          }}
          onSubmit={handleBook}
        />
      )}

      <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs text-white/50">
        <p>
          NR E-Ticket Major 17-19 ส.ค. 2569 ห้องประชุมแสงมณี โรงเรียนฤทธิณรงค์รอน
        </p>
        <p className="mt-1">{EVENT.tagline}</p>
      </footer>
    </div>
  );
}
