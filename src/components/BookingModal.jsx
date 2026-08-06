import { useState } from 'react';
import { AUDIENCE_TYPES, dateLabelOfKey } from '../config';

function getSeatId(seat) {
  return seat.id || seat.seatId;
}

function formatSeatId(seat) {
  return String(getSeatId(seat)).replace('-', '');
}

export default function BookingModal({
  seats,
  selectedDate,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [audienceType, setAudienceType] = useState(AUDIENCE_TYPES[0].value);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    let valid = true;

    if (name.trim().length < 2) {
      setNameError('กรุณากรอกชื่อ-นามสกุลให้ครบถ้วน');
      valid = false;
    } else {
      setNameError('');
    }

    if (!/^[0-9+\-()\s]{9,15}$/.test(phone.trim())) {
      setPhoneError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
      valid = false;
    } else {
      setPhoneError('');
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!valid) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      audienceType,
      showDateKey: selectedDate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-neon-cyan/40 bg-dark p-6 shadow-neon-cyan sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-neon-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]">
              กรอกข้อมูลผู้จอง
            </h2>
            <p className="mt-1 text-sm text-white/60">
              ที่นั่งที่เลือก ({seats.length}):
              <span className="ml-1 font-bold text-white">
                {seats.map((s) => formatSeatId(s)).join(', ')}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-white/60 transition hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/60">ชื่อ-นามสกุล *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-neon-cyan focus:shadow-neon-cyan"
            />
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">เบอร์โทรศัพท์ *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 0812345678"
              required
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-neon-cyan focus:shadow-neon-cyan"
            />
            {phoneError && <p className="mt-1 text-xs text-red-400">{phoneError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">อีเมล (ไม่บังคับ)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="เช่น name@example.com"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-neon-cyan focus:shadow-neon-cyan"
            />
            {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">รอบวันแสดง</label>
            <p className="rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-3 text-sm font-bold text-neon-cyan">
              🎭 {dateLabelOfKey(selectedDate)}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">คุณเป็นใครในกลุ่มเป้าหมาย *</label>
            <select
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-neon-cyan focus:shadow-neon-cyan"
            >
              {AUDIENCE_TYPES.map((type) => (
                <option key={type.value} value={type.value} className="bg-dark">
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {errorMessage && (
            <p className="rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
              {errorMessage}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-white/20 py-3 text-white/70 transition hover:bg-white/10 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-neon-cyan py-3 font-bold text-dark shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'กำลังจอง...' : 'ยืนยันการจอง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
