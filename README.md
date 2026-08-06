# 🎟️ NR E-Ticket Major

**Seat Booking & Event Management System**
ระบบจัดการการจองที่นั่งและตั๋วอิเล็กทรอนิกส์ (E-Ticket) แบบครบวงจร พัฒนาขึ้นเพื่อสนับสนุนทีม Media & PR[cite: 1] ในงาน Ritthinrong Performing Arts Festival โดยออกแบบมาให้ใช้งานง่าย รองรับการจองหลายที่นั่ง และมีระบบจัดการหลังบ้านสำหรับสตาฟฟ์หน้างาน เพื่อส่งต่อเป็น Legacy (เก็บองค์ความรู้ + ส่งต่อรุ่น)[cite: 1] ให้กับทีมงานในปีต่อๆ ไป

---

## ✨ Features (ความสามารถของระบบ)

### 👨‍💻 สำหรับผู้ชม (User / Audience)
*   **Date Selection:** ระบบเลือกรอบวันเข้าชมที่แยกออกจากกันอย่างชัดเจน
*   **Multiple Seat Booking:** รองรับการเลือกและจองหลายที่นั่งพร้อมกันใน 1 Transaction
*   **Real-time Seat Map:** แสดงสถานะที่นั่ง (ว่าง/จองแล้ว) อัปเดตแบบเรียลไทม์
*   **Auto E-Ticket & QR Code:** เมื่อจองสำเร็จ ระบบจะส่งตั๋ว E-Ticket พร้อม QR Code สำหรับสแกนเข้างานไปยังอีเมลผู้จองอัตโนมัติ 
*   **Downloadable Ticket:** ผู้ชมสามารถกดดาวน์โหลดตั๋วเป็นไฟล์ภาพ (.png) เก็บไว้ในเครื่องได้ทันที

### 🛡️ สำหรับทีมงาน (Staff / Admin Dashboard)
*   **Secure Access:** หน้า Dashboard หลังบ้านล็อกด้วยรหัสผ่าน (PIN) โดยแอดมินสามารถเปลี่ยนรหัสผ่านได้เองจากหน้าตั้งค่า
*   **QR Code Scanner:** ระบบเปิดกล้องสแกน QR Code จากตั๋วผู้ชมเพื่อเช็คอินเข้างานได้ทันที (รองรับทั้งมือถือและคอมพิวเตอร์)
*   **Manual Check-in Fallback:** มีช่องกรอกรหัสตั๋วด้วยมือ เพื่อรองรับกรณีที่กล้องมีปัญหาหรือผู้ใช้ไม่ได้นำ QR Code มา
*   **Date-based Filtering & Booker List:** สลับมุมมองเพื่อดูรายชื่อผู้ที่จองตั๋วในแต่ละวัน พร้อมข้อมูลเบอร์โทรศัพท์สำหรับการโทรประสานงานหรือคอนเฟิร์มที่นั่งล่วงหน้า

---

## 🛠️ Tech Stack

*   **Frontend:** React (Vite)
*   **Styling:** Tailwind CSS
*   **Database:** Firebase Firestore (NoSQL, Real-time Updates)
*   **Email Service:** EmailJS (`@emailjs/browser`)
*   **Utilities:** 
    *   `html5-qrcode` (สำหรับระบบสแกนหน้างาน)
    *   `html2canvas` (สำหรับระบบดาวน์โหลดตั๋วภาพ)

---

## 🚀 Installation & Setup (การติดตั้งเพื่อพัฒนา)

1. **Clone the repository**
   ```bash
   git clone [https://github.com/your-username/nr-e-ticket-major.git](https://github.com/your-username/nr-e-ticket-major.git)
   cd nr-e-ticket-major

Install dependencies

Bash
npm install
Environment Variables Configuration
สร้างไฟล์ .env ไว้ที่ root ของโปรเจกต์ และกำหนดค่า API Key ต่างๆ ดังนี้:

ข้อมูลโค้ด
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id

# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
Run the development server

Bash
npm run dev
(หากต้องการทดสอบระบบสแกน QR Code บนโทรศัพท์มือถือที่ใช้ Wi-Fi วงเดียวกัน ให้ใช้คำสั่ง npm run dev -- --host)

## 📜 License

This project is open-sourced software licensed under the **MIT License**.
อนุญาตให้นำซอร์สโค้ดไปศึกษา ดัดแปลง และใช้งานได้อย่างอิสระ โดยต้องคงไว้ซึ่งประกาศแจ้งเตือนลิขสิทธิ์และสิทธิ์อนุญาตต้นฉบับ
