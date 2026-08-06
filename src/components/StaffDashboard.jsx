import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { db, isFirebaseConfigured } from '../firebase';
import {
  audienceLabel,
  dateKeyOfLabel,
  seatStatus,
  statusFieldFor,
  EVENT,
} from '../config';

const STAFF_PIN = import.meta.env.VITE_STAFF_PIN || 'deknites26';
const FILTER_DATES = ['ทั้งหมด', '17 สิงหาคม 2569', '18 สิงหาคม 2569', '19 สิงหาคม 2569'];

function seatListOf(ticket) {
  if (ticket.seats && ticket.seats.length) return ticket.seats;
  if (ticket.seatId) return [ticket.seatId];
  return [];
}

function seatTextOf(ticket) {
  return seatListOf(ticket).map((s) => String(s).replace('-', '')).join(', ');
}

export default function StaffDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [seats, setSeats] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [filterDate, setFilterDate] = useState(FILTER_DATES[0]);
  const [actingCode, setActingCode] = useState(null);
  const [notice, setNotice] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [staffView, setStaffView] = useState('seats');
  const [sortBy, setSortBy] = useState('createdAt');
  const scannerRef = useRef(null);
  const ticketsRef = useRef([]);
  const configured = isFirebaseConfigured();

  ticketsRef.current = tickets;

  useEffect(
    () => () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    },
    [],
  );

  function handlePinSubmit(e) {
    e.preventDefault();
    if (pinInput === STAFF_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  }

  async function checkInByCode(code) {
    const trimmed = String(code || '').trim();
    if (!trimmed) return;
    setQuery(trimmed);
    const ticket = ticketsRef.current.find((t) => t.ticketCode === trimmed);
    if (ticket) {
      await handleCheckIn(ticket);
    } else {
      setNotice(`ไม่พบตั๋วรหัส "${trimmed}"`);
    }
  }

  async function onScanSuccess(decodedText) {
    try {
      await stopScanner();
      const parts = String(decodedText).split('|');
      const code = parts.length > 1 ? parts[1] : decodedText;
      await checkInByCode(code);
    } catch (err) {
      console.error('scan handling failed', err);
    }
  }

  useEffect(() => {
    if (!scannerOpen) return undefined;
    let active = true;
    (async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        if (!active) return;
        setScanning(true);
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          onScanSuccess,
          () => {},
        );
      } catch (err) {
        console.error('scanner start failed', err);
        if (!active) return;
        setScanning(false);
        setScannerOpen(false);
        setNotice('ไม่สามารถเปิดกล้องได้ กรุณาพิมพ์รหัสตั๋วแทน');
      }
    })();
    return () => {
      active = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  async function stopScanner() {
    setScannerOpen(false);
    setScanning(false);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    checkInByCode(manualCode);
  }

  useEffect(() => {
    if (!configured) return undefined;
    const unsubSeats = onSnapshot(
      collection(db, 'seats'),
      (snap) => {
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        setSeats(list);
      },
      (err) => {
        console.error(err);
        setError('ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการตั้งค่า Firebase');
      },
    );
    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snap) => {
      const list = [];
      snap.forEach((d) => list.push(d.data()));
      setTickets(list);
    });
    return () => {
      unsubSeats();
      unsubTickets();
    };
  }, [configured]);

  const total = seats.length;
  const filterDateKey = dateKeyOfLabel(filterDate);
  const bookedCount = seats.filter((s) => seatStatus(s, filterDateKey) === 'booked').length;
  const checkedInCount = seats.filter((s) => seatStatus(s, filterDateKey) === 'checkedin').length;
  const availableCount = seats.filter((s) => seatStatus(s, filterDateKey) === 'available').length;

  const dateFilteredTickets = useMemo(() => {
    if (filterDate === FILTER_DATES[0]) return tickets;
    return tickets.filter((t) => String(t.showDate || '') === filterDate);
  }, [tickets, filterDate]);

  const filterTotalTickets = dateFilteredTickets.length;
  const filterTotalSeats = dateFilteredTickets.reduce(
    (sum, t) => sum + seatListOf(t).length,
    0,
  );
  const filterCheckedIn = dateFilteredTickets.filter((t) => t.isCheckedIn).length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dateFilteredTickets
      .filter((t) => {
        if (!q) return true;
        const seatsText = seatListOf(t).join(' ').toLowerCase();
        return (
          String(t.ticketCode || '').toLowerCase().includes(q) ||
          String(t.name || '').toLowerCase().includes(q) ||
          seatsText.includes(q) ||
          seatTextOf(t).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [dateFilteredTickets, query]);

  async function handleCheckIn(ticket) {
    setActingCode(ticket.ticketCode);
    setNotice(null);
    try {
      const ticketRef = doc(db, 'tickets', ticket.ticketCode);
      const seatIds = seatListOf(ticket);
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(ticketRef);
        if (!snap.exists()) throw new Error('NOT_FOUND');
        const data = snap.data();
        if (data.isCheckedIn) throw new Error('ALREADY');
        txn.update(ticketRef, {
          isCheckedIn: true,
          checkedInAt: new Date().toISOString(),
        });
        for (const seatId of seatIds) {
          txn.update(doc(db, 'seats', seatId), {
            [ticket.showDateKey ? statusFieldFor(ticket.showDateKey) : 'status']: 'checkedin',
          });
        }
      });
      setNotice(`✔ เช็กอินสำเร็จ: ${ticket.ticketCode} (ที่นั่ง ${seatTextOf(ticket)})`);
    } catch (err) {
      if (err.message === 'ALREADY') {
        setNotice('ตั๋วนี้เช็กอินไปแล้ว');
      } else {
        setNotice('เกิดข้อผิดพลาดในการเช็กอิน กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setActingCode(null);
    }
  }

  async function copyPhone(phone) {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(String(phone));
      setNotice(`✔ คัดลอกเบอร์ ${phone} แล้ว`);
    } catch (err) {
      setNotice('ไม่สามารถคัดลอกเบอร์ได้');
    }
  }

  function exportCSV() {
    if (!bookers.length) return;
    const headers = [
      'รหัสตั๋ว',
      'ชื่อ-นามสกุล',
      'เบอร์โทรศัพท์',
      'อีเมล',
      'กลุ่มเป้าหมาย',
      'ที่นั่ง',
      'เช็คอิน',
      'เวลาเช็คอิน',
    ];
    const rows = bookers.map((t) => [
      t.ticketCode || '',
      t.name || '',
      t.phone || '',
      t.email || '',
      audienceLabel(t.audienceType) || '',
      seatTextOf(t),
      t.isCheckedIn ? 'ใช่' : 'ไม่',
      t.checkedInAt ? new Date(t.checkedInAt).toLocaleString('th-TH') : '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bookers-${filterDate === FILTER_DATES[0] ? 'all' : filterDate.replace(/ /g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const bookers = useMemo(() => {
    const list = [...dateFilteredTickets];
    if (sortBy === 'seat') {
      list.sort((a, b) => {
        const key = (t) => {
          const seats = seatListOf(t).map((s) => String(s).replace('-', ''));
          return seats.length ? seats[0] : '';
        };
        return key(a).localeCompare(key(b), 'en', { numeric: true });
      });
    } else {
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }
    return list;
  }, [dateFilteredTickets, sortBy]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="rounded-3xl border border-neon-cyan/40 bg-white/5 p-6 text-center shadow-neon-cyan">
          <span className="text-4xl drop-shadow-[0_0_10px_rgba(255,46,196,0.8)]">🔒</span>
          <h2 className="mt-3 text-xl font-bold text-neon-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]">
            หลังบ้านทีมงาน
          </h2>
          <p className="mt-1 text-xs text-white/50">กรอกรหัสผ่านเพื่อเข้าใช้งาน</p>
          <form onSubmit={handlePinSubmit} className="mt-5 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="Password"
              autoFocus
              className="w-full rounded-xl border border-white/20 bg-dark/60 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-white/30 outline-none transition focus:border-neon-cyan focus:shadow-neon-cyan"
            />
            {pinError && (
              <p className="text-xs text-red-400">รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่</p>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-neon-cyan py-3 font-bold text-dark shadow-neon-cyan transition hover:brightness-110"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold text-neon-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]">
          หลังบ้านทีมงาน
        </h2>
        <p className="mt-1 text-xs text-white/50">
          งานแสดง {EVENT.dates} · ดึงข้อมูลแบบ Real-time จาก Firebase
        </p>
      </div>

      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setStaffView('seats')}
          className={`flex-1 rounded-xl px-2 py-2 text-xs transition sm:text-sm ${
            staffView === 'seats'
              ? 'bg-neon-cyan font-bold text-dark shadow-neon-cyan'
              : 'text-white/60 hover:text-white'
          }`}
        >
          🪑 มุมมองการจัดการที่นั่ง
        </button>
        <button
          type="button"
          onClick={() => setStaffView('bookers')}
          className={`flex-1 rounded-xl px-2 py-2 text-xs transition sm:text-sm ${
            staffView === 'bookers'
              ? 'bg-neon-cyan font-bold text-dark shadow-neon-cyan'
              : 'text-white/60 hover:text-white'
          }`}
        >
          📋 มุมมองรายชื่อผู้จอง
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="ที่นั่งทั้งหมด" value={total || '–'} color="text-neon-cyan" />
        <StatCard label="ว่าง" value={total ? availableCount : '–'} color="text-white" />
        <StatCard label="จองแล้ว" value={total ? bookedCount : '–'} color="text-neon-pink" />
        <StatCard label="เช็กอินแล้ว" value={total ? checkedInCount : '–'} color="text-emerald-400" />
      </div>

      {!configured && (
        <div className="rounded-2xl border border-neon-yellow/40 bg-neon-yellow/10 p-4 text-sm text-neon-yellow">
          ⚠️ ยังไม่ได้ตั้งค่า Firebase
        </div>
      )}

      {configured && error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-emerald-300">
          {notice}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <label className="mb-2 block text-sm text-white/60">📅 ตัวกรองรอบวันแสดง</label>
        <div className="flex flex-wrap gap-2">
          {FILTER_DATES.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => setFilterDate(date)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                filterDate === date
                  ? 'border-neon-cyan bg-neon-cyan font-bold text-dark shadow-neon-cyan'
                  : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {date}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SummaryMini label="ตั๋วที่จอง" value={filterTotalTickets} color="text-neon-pink" />
          <SummaryMini label="ที่นั่งที่จอง" value={filterTotalSeats} color="text-neon-cyan" />
          <SummaryMini label="เช็กอินแล้ว" value={filterCheckedIn} color="text-emerald-400" />
        </div>
      </div>

      {staffView === 'seats' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm text-white/60">🔍 ค้นหาตั๋ว (รหัสตั๋ว / ชื่อ / ที่นั่ง)</label>
            <button
              type="button"
              onClick={() => {
                if (scannerOpen) {
                  stopScanner();
                } else {
                  setNotice(null);
                  setScannerOpen(true);
                }
              }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-dark transition hover:brightness-110"
            >
              {scannerOpen ? 'ปิดกล้อง ✕' : '📷 เปิดกล้องสแกน QR Code'}
            </button>
          </div>

          <div id="qr-reader" className={scannerOpen ? 'mx-auto max-w-sm overflow-hidden rounded-xl' : 'hidden'} />

          {scannerOpen && (
            <p className="mt-2 text-center text-xs text-white/50">
              {scanning ? 'เล็งกล้องไปที่ QR Code บนตั๋วเพื่อเช็กอินอัตโนมัติ' : 'กำลังเปิดกล้อง...'}
            </p>
          )}

          <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="พิมพ์รหัสตั๋ว เช่น RT-XXXXXX"
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-dark/60 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-neon-cyan focus:shadow-neon-cyan"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="flex-shrink-0 rounded-xl bg-neon-cyan px-4 py-3 text-sm font-bold text-dark shadow-neon-cyan transition hover:brightness-110 disabled:opacity-40"
            >
              ค้นหา / เช็คอิน
            </button>
          </form>
          <p className="mt-2 text-[10px] text-white/40">
            ใช้ได้เมื่อกล้องใช้งานไม่ได้ · พิมพ์รหัสตั๋วเพื่อเช็กอินแบบเดียวกัน
          </p>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="เช่น RT-ABC123 หรือ สมชาย หรือ A-05"
            className="mt-3 w-full rounded-xl border border-white/20 bg-dark/60 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-neon-cyan focus:shadow-neon-cyan"
          />
        </div>
      )}

      {staffView === 'seats' && (query.trim() || filterDate !== FILTER_DATES[0]) && (
        <div className="space-y-3">
          {results.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
              {query.trim()
                ? `ไม่พบตั๋วที่ตรงกับ "${query}"`
                : `ยังไม่มีการจองสำหรับ ${filterDate}`}
            </div>
          )}
          {results.map((ticket) => (
            <div
              key={ticket.ticketCode}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-neon-yellow">
                      {ticket.ticketCode}
                    </span>
                    {ticket.isCheckedIn ? (
                      <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                        เช็กอินแล้ว ✓
                      </span>
                    ) : (
                      <span className="rounded-full border border-neon-pink/50 bg-neon-pink/10 px-2 py-0.5 text-[10px] text-neon-pink">
                        ยังไม่เช็กอิน
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-white">{ticket.name}</p>
                  <p className="text-xs text-white/50">
                    ที่นั่ง <b className="text-white">{seatTextOf(ticket)}</b> ·{' '}
                    {audienceLabel(ticket.audienceType)}
                    {ticket.checkedInAt && (
                      <> · เช็กอินเมื่อ {formatTime(ticket.checkedInAt)}</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckIn(ticket)}
                  disabled={ticket.isCheckedIn || actingCode !== null}
                  className={
                    ticket.isCheckedIn
                      ? 'rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300'
                      : 'rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-dark transition hover:brightness-110 disabled:opacity-50'
                  }
                >
                  {actingCode === ticket.ticketCode
                    ? 'กำลังเช็กอิน...'
                    : ticket.isCheckedIn
                      ? 'เช็กอินแล้ว'
                      : 'เช็กอิน ✓'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {staffView === 'seats' && !query.trim() && filterDate === FILTER_DATES[0] && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
          พิมพ์เพื่อค้นหาตั๋วและเช็กอินผู้ชมหน้างาน หรือกรองตามรอบวันแสดงด้านบน
        </div>
      )}

      {staffView === 'bookers' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-white/60">เรียงตาม</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-white/20 bg-dark/60 px-3 py-2 text-sm text-white outline-none transition focus:border-neon-cyan"
              >
                <option value="createdAt" className="bg-dark">เวลาที่จอง (ใหม่ล่าสุด)</option>
                <option value="seat" className="bg-dark">หมายเลขที่นั่ง</option>
              </select>
            </div>
            <button
              type="button"
              onClick={exportCSV}
              disabled={!bookers.length}
              className="rounded-xl bg-neon-pink px-4 py-2 text-sm font-bold text-white shadow-neon-pink transition hover:brightness-110 disabled:opacity-40"
            >
              ⬇️ Export เป็น CSV
            </button>
          </div>

          {bookers.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
              {filterDate === FILTER_DATES[0]
                ? 'ยังไม่มีผู้จองในระบบ'
                : `ยังไม่มีผู้จองสำหรับ ${filterDate}`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-white/50">
                    <th className="py-2 pr-2 font-medium">ชื่อ-นามสกุล</th>
                    <th className="py-2 pr-2 font-medium">เบอร์โทร</th>
                    <th className="py-2 pr-2 font-medium">อีเมล</th>
                    <th className="py-2 pr-2 font-medium">กลุ่มเป้าหมาย</th>
                    <th className="py-2 pr-2 font-medium">ที่นั่ง</th>
                    <th className="py-2 font-medium">เช็คอิน</th>
                  </tr>
                </thead>
                <tbody>
                  {bookers.map((t) => (
                    <tr key={t.ticketCode} className="border-b border-white/5">
                      <td className="py-2.5 pr-2">
                        <p className="font-bold text-white">{t.name}</p>
                        <p className="font-mono text-[10px] text-neon-yellow/80">{t.ticketCode}</p>
                      </td>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-1">
                          <span className="text-white/80">{t.phone || '–'}</span>
                          {t.phone && (
                            <button
                              type="button"
                              onClick={() => copyPhone(t.phone)}
                              title="คัดลอกเบอร์"
                              className="rounded-md border border-white/20 px-1.5 py-0.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
                            >
                              📋
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-xs text-white/60">{t.email || '–'}</td>
                      <td className="py-2.5 pr-2 text-xs text-white/70">
                        {audienceLabel(t.audienceType)}
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className="font-bold text-neon-pink">{seatTextOf(t)}</span>
                      </td>
                      <td className="py-2.5">
                        {t.isCheckedIn ? (
                          <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                            เช็กอินแล้ว ✓
                          </span>
                        ) : (
                          <span className="rounded-full border border-neon-pink/50 bg-neon-pink/10 px-2 py-0.5 text-[10px] text-neon-pink">
                            ยังไม่เช็กอิน
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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

function SummaryMini({ label, value, color }) {
  return (
    <div className="rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-center">
      <p className={`text-xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-white/50">{label}</p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
