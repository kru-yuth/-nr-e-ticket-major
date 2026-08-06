import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { ZONES, EVENT, seatStatus } from '../config';

const ZONE_STYLES = {
  A: {
    seat: 'bg-blue-500 text-white hover:bg-blue-600',
    badge: 'bg-blue-500 text-white',
    dot: 'bg-blue-500',
  },
  B: {
    seat: 'bg-purple-500 text-white hover:bg-purple-600',
    badge: 'bg-purple-500 text-white',
    dot: 'bg-purple-500',
  },
  C: {
    seat: 'bg-amber-500 text-white hover:bg-amber-600',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  D: {
    seat: 'bg-emerald-500 text-white hover:bg-emerald-600',
    badge: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-500',
  },
};

function seatClasses(status, selected, zoneStyle) {
  if (selected) return `${zoneStyle.seat} scale-110 z-10 shadow-lg`;
  if (status === 'booked') return 'bg-gray-600 text-gray-400 cursor-not-allowed';
  if (status === 'checkedin') return 'bg-teal-600 text-white cursor-not-allowed';
  return `${zoneStyle.seat} cursor-pointer`;
}

function getSeatId(seat) {
  return seat.id || seat.seatId;
}

function SeatButton({ seat, status, selected, onToggleSeat, bookedBy }) {
  const label = String(getSeatId(seat)).replace('-', '');
  return (
    <button
      type="button"
      disabled={status !== 'available' && !selected}
      onClick={() => onToggleSeat(seat)}
      title={`ที่นั่ง ${getSeatId(seat)}${bookedBy ? ` · ${bookedBy}` : ''}`}
      className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold ${seatClasses(
        status,
        selected,
        ZONE_STYLES[seat.zone],
      )}`}
    >
      {label}
    </button>
  );
}

function ZoneBlock({ zone, seats, dateKey, selectedSeats, onToggleSeat }) {
  const style = ZONE_STYLES[zone.id];
  const zoneSeats = seats
    .filter((s) => s.zone === zone.id)
    .sort((a, b) => a.number - b.number);
  const freeCount = zoneSeats.filter((s) => seatStatus(s, dateKey) === 'available').length;

  const rows = [];
  for (let r = 0; r < zone.rows; r += 1) {
    rows.push(zoneSeats.slice(r * zone.cols, (r + 1) * zone.cols));
  }

  const isSelected = (seat) =>
    selectedSeats.some((s) => getSeatId(s) === getSeatId(seat));

  return (
    <section className={`${zone.id === 'B' || zone.id === 'C' ? 'flex-1' : ''}`}>
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${style.badge}`}
        >
          {zone.name}
        </span>
        <span className="text-xs text-white/50">
          ว่าง {freeCount}/{zone.seats}
        </span>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="overflow-x-auto pb-4">
          <div className="mx-auto w-max space-y-2 sm:space-y-3">
            {rows.map((row, i) => (
              <div
                key={`${zone.id}-row-${i}`}
                className="grid gap-2 sm:gap-3"
                style={{ gridTemplateColumns: `repeat(${zone.cols}, 3rem)` }}
              >
                {row.length > 0
                  ? row.map((seat) => (
                      <SeatButton
                        key={getSeatId(seat)}
                        seat={seat}
                        status={seatStatus(seat, dateKey)}
                        bookedBy={seat[`bookedBy_${dateKey}`] || seat.bookedBy}
                        selected={isSelected(seat)}
                        onToggleSeat={onToggleSeat}
                      />
                    ))
                  : Array.from({ length: zone.cols }).map((_, ci) => (
                      <div
                        key={`${zone.id}-ph-${ci}`}
                        className="h-12 w-12 flex-shrink-0 animate-pulse rounded-md border border-white/5 bg-white/5"
                      />
                    ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SeatMap({ dateKey, selectedSeats, onToggleSeat, onClear, onBook }) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return undefined;
    }
    const unsub = onSnapshot(
      collection(db, 'seats'),
      (snap) => {
        const list = snap.docs.map((docRef) => ({ ...docRef.data(), id: docRef.id }));
        setSeats(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('ไม่สามารถโหลดข้อมูลที่นั่งได้ กรุณาตรวจสอบการตั้งค่า Firebase');
        setLoading(false);
      },
    );
    return unsub;
  }, [configured]);

  const total = seats.length;
  const available = seats.filter((s) => seatStatus(s, dateKey) === 'available').length;
  const booked = seats.filter((s) => seatStatus(s, dateKey) === 'booked').length;
  const checkedIn = seats.filter((s) => seatStatus(s, dateKey) === 'checkedin').length;

  const zoneA = ZONES.find((z) => z.id === 'A');
  const zoneB = ZONES.find((z) => z.id === 'B');
  const zoneC = ZONES.find((z) => z.id === 'C');
  const zoneD = ZONES.find((z) => z.id === 'D');

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="ที่นั่งทั้งหมด" value={total || '–'} color="text-slate-300" />
        <StatCard label="ว่าง" value={total ? available : '–'} color="text-white" />
        <StatCard label="จองแล้ว" value={total ? booked : '–'} color="text-slate-400" />
        <StatCard label="เช็กอินแล้ว" value={total ? checkedIn : '–'} color="text-teal-400" />
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
        <p className="mb-2 flex flex-wrap items-center justify-center gap-4">
          <Legend dot="bg-blue-500" label="โซน A" />
          <Legend dot="bg-purple-500" label="โซน B" />
          <Legend dot="bg-amber-500" label="โซน C" />
          <Legend dot="bg-emerald-500" label="โซน D" />
        </p>
        <p className="flex flex-wrap items-center justify-center gap-4">
          <Legend box="bg-blue-500 shadow-lg" label="กำลังเลือก" />
          <Legend dot="bg-gray-600" label="จองแล้ว" />
          <Legend dot="bg-teal-600" label="เช็กอินแล้ว" />
        </p>
      </div>

      {!configured && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
          ตั้งค่า Firebase แล้วเปิดแอปใหม่อีกครั้งเพื่อดูผังที่นั่ง
        </div>
      )}

      {configured && loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
          ⏳ กำลังโหลดข้อมูลที่นั่ง...
        </div>
      )}

      {configured && !loading && error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-400/10 p-8 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {configured && !loading && !error && (
        <>
          {total === 0 && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/70">
              ยังไม่มีข้อมูลที่นั่งในระบบ → ไปที่แท็บ <b>ตั้งค่าระบบ</b> แล้วกดสร้างที่นั่ง 96 ที่ก่อน
            </div>
          )}

          <div className="relative mx-auto mb-8 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs font-bold tracking-[0.35em] text-white/80">★ STAGE · เวที ★</p>
            <p className="mt-1 text-[10px] text-white/50">{EVENT.festival}</p>
          </div>

          <img
            src="/seatmap.png"
            alt="แผนผังที่นั่ง"
            className="mx-auto mb-8 w-full max-w-4xl rounded-lg object-contain"
          />

          <div className="space-y-6">
            <ZoneBlock
              zone={zoneA}
              seats={seats}
              dateKey={dateKey}
              selectedSeats={selectedSeats}
              onToggleSeat={onToggleSeat}
            />
            <div className="flex flex-col gap-6 lg:flex-row">
              <ZoneBlock
                zone={zoneB}
                seats={seats}
                dateKey={dateKey}
                selectedSeats={selectedSeats}
                onToggleSeat={onToggleSeat}
              />
              <ZoneBlock
                zone={zoneC}
                seats={seats}
                dateKey={dateKey}
                selectedSeats={selectedSeats}
                onToggleSeat={onToggleSeat}
              />
            </div>
            <ZoneBlock
              zone={zoneD}
              seats={seats}
              dateKey={dateKey}
              selectedSeats={selectedSeats}
              onToggleSeat={onToggleSeat}
            />
          </div>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
        {selectedSeats.length > 0 ? (
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-dark p-3 shadow-lg backdrop-blur-md">
            <div className="min-w-0">
              <p className="text-xs text-white/60">เลือกแล้ว</p>
              <p className="text-2xl font-extrabold text-white">{selectedSeats.length} ที่นั่ง</p>
              <p className="truncate text-[10px] text-white/50">
                {selectedSeats.map((s) => String(getSeatId(s)).replace('-', '')).join(', ')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={onBook}
                disabled={!configured}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                ดำเนินการต่อ →
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-dark p-3 text-center text-xs text-white/50">
            แตะที่นั่งว่างเพื่อเลือก (เลือกได้หลายที่นั่ง) · ระบบ {EVENT.name}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}

function Legend({ dot, box, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${box || dot}`} />
      {label}
    </span>
  );
}
