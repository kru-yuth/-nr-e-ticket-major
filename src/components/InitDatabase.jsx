import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { buildSeatList, SHOW_DATES, ZONES } from '../config';

const DEFAULT_PASSWORD = '1234';

export default function InitDatabase() {
  const [configured] = useState(isFirebaseConfigured());
  const [storedPassword, setStoredPassword] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState(null);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadPassword() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'adminAuth'));
        const pwd =
          snap.exists() && snap.data().password ? snap.data().password : DEFAULT_PASSWORD;
        if (active) setStoredPassword(pwd);
      } catch (err) {
        console.error(err);
        if (active) setStoredPassword(DEFAULT_PASSWORD);
      }
    }
    if (configured) loadPassword();
    return () => {
      active = false;
    };
  }, [configured]);

  function handleLogin(e) {
    e.preventDefault();
    if (passwordInput === (storedPassword || DEFAULT_PASSWORD)) {
      setIsAuthenticated(true);
      setAuthError(false);
      setPasswordInput('');
    } else {
      setAuthError(true);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(false);
    if (newPassword.length < 4) {
      setChangeError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setBusy(true);
    try {
      await setDoc(doc(db, 'settings', 'adminAuth'), { password: newPassword });
      setStoredPassword(newPassword);
      setChangeSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setChangeError('ไม่สามารถบันทึกรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  async function clearCollection(path) {
    const snap = await getDocs(query(collection(db, path)));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return snap.size;
  }

  async function writeSeats() {
    const list = buildSeatList();
    const batch = writeBatch(db);
    list.forEach((seat) => {
      const perDate = {};
      SHOW_DATES.forEach((d) => {
        perDate[`status_${d.key}`] = 'available';
        perDate[`bookedBy_${d.key}`] = null;
        perDate[`audienceType_${d.key}`] = null;
      });
      batch.set(doc(db, 'seats', seat.seatId), {
        ...seat,
        ...perDate,
        status: 'available',
        bookedBy: null,
        audienceType: null,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
    return list.length;
  }

  async function createSeats() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const removed = await clearCollection('seats');
      const created = await writeSeats();
      setMessage(`สร้างที่นั่งสำเร็จ ${created} ที่ · ลบข้อมูลเดิม ${removed} รายการ`);
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถสร้างที่นั่งได้: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const removedTickets = await clearCollection('tickets');
      const removedSeats = await clearCollection('seats');
      const created = await writeSeats();
      setMessage(`รีเซ็ตระบบเรียบร้อย · ลบตั๋ว ${removedTickets} ใบ · สร้างที่นั่งใหม่ ${created} ที่`);
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="rounded-3xl border border-neon-cyan/40 bg-white/5 p-6 text-center shadow-neon-cyan">
          <span className="text-4xl drop-shadow-[0_0_10px_rgba(255,46,196,0.8)]">⚙️</span>
          <h2 className="mt-3 text-xl font-bold text-neon-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]">
            การตั้งค่าระบบ
          </h2>
          <p className="mt-1 text-xs text-white/50">กรอกรหัสผ่านเพื่อเข้าสู่หน้าการตั้งค่า</p>
          <form onSubmit={handleLogin} className="mt-5 space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setAuthError(false);
              }}
              placeholder="รหัสผ่าน"
              disabled={configured && storedPassword === null}
              autoFocus
              className="w-full rounded-xl border border-white/20 bg-dark/60 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-white/30 outline-none transition focus:border-neon-cyan focus:shadow-neon-cyan disabled:opacity-50"
            />
            {authError && (
              <p className="text-xs text-red-400">รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่</p>
            )}
            <button
              type="submit"
              disabled={configured && storedPassword === null}
              className="w-full rounded-xl bg-neon-cyan py-3 font-bold text-dark shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
            >
              {configured && storedPassword === null ? 'กำลังโหลด...' : 'เข้าสู่ระบบการตั้งค่า'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-neon-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]">
          การตั้งค่าระบบครั้งแรก
        </h2>
        <p className="mt-2 text-sm text-white/60">
          กดปุ่มด้านล่างเพื่อสร้างที่นั่ง 96 ที่ลง Firebase อัตโนมัติ
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {ZONES.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-dark/60 px-3 py-2"
            >
              <span className="text-white/70">{zone.name}</span>
              <span className="font-bold text-white">{zone.seats} ที่</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-right text-xs text-white/40">
          รวม 96 ที่ · Zone A 30 · Zone B 18 · Zone C 24 · Zone D 24
        </p>

        {!configured && (
          <p className="mt-4 rounded-xl border border-neon-yellow/40 bg-neon-yellow/10 p-3 text-xs text-neon-yellow">
            ⚠️ ต้องตั้งค่า Firebase ก่อนใช้งานปุ่มนี้
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={createSeats}
            disabled={!configured || busy}
            className="rounded-xl bg-neon-cyan py-3 font-bold text-dark shadow-neon-cyan transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? '⏳ กำลังทำงาน...' : '⚡ สร้าง / รีเซ็ตที่นั่ง 96 ที่'}
          </button>
          <button
            type="button"
            onClick={resetAll}
            disabled={!configured || busy}
            className="rounded-xl border border-red-400/50 bg-red-400/10 py-3 font-bold text-red-300 transition hover:bg-red-400/20 disabled:opacity-40"
          >
            ล้างตั๋วทั้งหมด + สร้างที่นั่งใหม่ (รีเซ็ตเต็มระบบ)
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold text-neon-pink drop-shadow-[0_0_8px_rgba(255,46,196,0.7)]">
          🔑 เปลี่ยนรหัสผ่านสำหรับผู้ดูแลระบบ
        </h3>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setChangeError(null);
              setChangeSuccess(false);
            }}
            placeholder="รหัสผ่านใหม่"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-neon-pink focus:shadow-neon-pink"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setChangeError(null);
              setChangeSuccess(false);
            }}
            placeholder="ยืนยันรหัสผ่านใหม่"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-neon-pink focus:shadow-neon-pink"
          />
          {changeError && (
            <p className="rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
              {changeError}
            </p>
          )}
          {changeSuccess && (
            <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-300">
              ✔ อัปเดตรหัสผ่านสำเร็จ ใช้รหัสใหม่ในครั้งถัดไป
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-neon-pink py-3 font-bold text-white shadow-neon-pink transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? '⏳ กำลังบันทึก...' : 'บันทึกรหัสผ่าน'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-white/50">
        <p className="font-bold text-white/70">คำเตือน</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>การกด "สร้าง/รีเซ็ตที่นั่ง" จะลบข้อมูลที่นั่งทั้งหมด แล้วสร้างใหม่เป็นสถานะ "ว่าง" ทุกที่นั่ง</li>
          <li>ปุ่ม "รีเซ็ตเต็มระบบ" จะลบตั๋วที่จองไว้ทั้งหมดด้วย — ใช้เฉพาะเมื่อต้องการเริ่มงานใหม่</li>
          <li>การจองใช้ Firebase Transaction ป้องกันการจองที่นั่งเดียวกันพร้อมกัน · ข้อมูลตั๋วเก็บใน Collection "tickets"</li>
        </ul>
      </div>
    </div>
  );
}
