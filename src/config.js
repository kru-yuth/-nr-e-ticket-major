export const EVENT = {
  name: 'NR E-Ticket Major',
  festival: 'Ritthinrong Performing Arts Festival',
  tagline: 'ละครเวทีประเพณี · เทศกาลศิลปะการแสดงและสื่อสร้างสรรค์',
  dates: '30 ก.ค. – 1 ส.ค.',
  time: '12.30 น. เป็นต้นไป',
  place: 'ห้องประชุมแสงมณี โรงเรียนฤทธิณรงค์รอน',
  note: 'กรุณามาก่อนเวลา เพื่อเช็คอินก่อนเข้าโรง',
};

export const SHOW_DATES = [
  { key: '2026-08-17', label: '17 สิงหาคม 2569' },
  { key: '2026-08-18', label: '18 สิงหาคม 2569' },
  { key: '2026-08-19', label: '19 สิงหาคม 2569' },
];

export const DEFAULT_SHOW_DATE = SHOW_DATES[0].key;

export function statusFieldFor(dateKey) {
  return `status_${dateKey}`;
}

export function bookedByFieldFor(dateKey) {
  return `bookedBy_${dateKey}`;
}

export function audienceFieldFor(dateKey) {
  return `audienceType_${dateKey}`;
}

export function bookedAtFieldFor(dateKey) {
  return `bookedAt_${dateKey}`;
}

export function seatStatus(seat, dateKey) {
  if (dateKey) {
    const s = seat[statusFieldFor(dateKey)];
    if (s) return s;
  }
  return seat.status || 'available';
}

export function dateKeyOfLabel(label) {
  const found = SHOW_DATES.find((d) => d.label === label);
  return found ? found.key : null;
}

export function dateLabelOfKey(key) {
  const found = SHOW_DATES.find((d) => d.key === key);
  return found ? found.label : key;
}

export const ZONES = [
  { id: 'A', name: 'โซน A', desc: 'VIP ใกล้เวที', seats: 30, rows: 5, cols: 6 },
  { id: 'B', name: 'โซน B', desc: 'ฝั่งซ้ายกลาง', seats: 18, rows: 3, cols: 6 },
  { id: 'C', name: 'โซน C', desc: 'ฝั่งขวากลาง', seats: 24, rows: 4, cols: 6 },
  { id: 'D', name: 'โซน D', desc: 'ทั่วไป', seats: 24, rows: 4, cols: 6 },
];

export const AUDIENCE_TYPES = [
  { value: 'school', label: 'นักเรียนในโรงเรียน' },
  { value: 'other_school', label: 'นักเรียนจากโรงเรียนอื่น' },
  { value: 'public', label: 'ผู้ปกครอง / บุคคลทั่วไป' },
  { value: 'teacher', label: 'ครู / มหาวิทยาลัย' },
];

export function audienceLabel(value) {
  const found = AUDIENCE_TYPES.find((t) => t.value === value);
  return found ? found.label : value;
}

export function buildSeatList() {
  const list = [];
  for (const zone of ZONES) {
    let number = 1;
    for (let row = 1; row <= zone.rows; row += 1) {
      for (let col = 1; col <= zone.cols; col += 1) {
        list.push({
          seatId: `${zone.id}-${String(number).padStart(2, '0')}`,
          zone: zone.id,
          row,
          number,
        });
        number += 1;
      }
    }
  }
  return list;
}
