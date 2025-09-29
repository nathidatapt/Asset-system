// ================== IMPORT ==================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ================== CONFIG DB ==================
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'assetnaja-4'
};

// ================== CREATE DB POOL ==================
const db = mysql.createPool(dbConfig);

// ================== JWT & GOOGLE ==================
const JWT_SECRET = 'your_jwt_secret';
const GOOGLE_CLIENT_ID = '1015472630656-knb4gb5hflaljv0hnt48hrpl5gj65hic.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ================== APP ==================
const app = express();
app.use(cors({
  origin: "http://localhost:5173",   // port ของ Vue dev server
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(bodyParser.json({ limit: '50mb' }));  // เพิ่มจาก default 100kb เป็น 50mb
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ================== GOOGLE LOGIN ==================
app.post('/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ success: false, message: 'Token ไม่ถูกต้อง' });

  try {
    // ตรวจสอบ token จาก Google
    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email.trim().toLowerCase(); // ลบ space และเปลี่ยนเป็นตัวเล็ก

    // จำกัดเฉพาะ email ของมหาวิทยาลัย
if (!email.endsWith('@lamduan.mfu.ac.th')) {
  return res.status(403).json({ success: false, message: 'ใช้ lamduan เท่านั้น' });
}


    const connection = await mysql.createConnection(dbConfig);
    let [rows] = await connection.execute('SELECT * FROM user WHERE email = ?', [email]);

    let user;
if (rows.length === 0) {
  // ถ้าไม่มีใน DB → ปฏิเสธการเข้าระบบ
  await connection.end();
  return res.status(403).json({
    success: false,
    message: 'ไม่พบผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแล'
  });
} else {
  user = rows[0];
}


    const token = jwt.sign({ userId: user.user_id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

    await connection.end();
    res.json({ success: true, user, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login ไม่สำเร็จ' });
  }

});

// ==================== Helper ====================

// แปลงวันที่ Excel เป็น MySQL DATE string (YYYY-MM-DD)
function parseExcelDate(val) {
  if (!val) return null; // ว่าง → NULL

  // ถ้าเป็นเลข Excel serial date
  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30); // Excel epoch
    const jsDate = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
    return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2,'0')}-${String(jsDate.getDate()).padStart(2,'0')}`;
  }

  // ถ้าเป็น string DD/MM/YY หรือ DD/MM/YYYY
  if (typeof val === "string" && val.includes("/")) {
    const parts = val.split('/');
    if (parts.length !== 3) return null;

    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += year >= 50 ? 1900 : 2000;

    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  // กรณีอื่น ๆ → NULL
  return null;
}

// ==================== Import Excel ====================
app.post("/asset/import", async (req, res) => {
  try {
    const assets = req.body.assets;
    console.log("ได้รับ assets:", assets.length);
    console.log("ตัวอย่าง record:", assets[0]); // debug

    if (!assets || assets.length === 0) {
      return res.status(400).json({ message: "ไม่มีข้อมูล" });
    }

    const values = assets.map(a => [
      Number(a.Company_Code) || 0,
      a.asset_number || "",
      Number(a.Subnumber) || 0,
      a.inventory_number || "",
      a.asset_description || "",
      a.model || "",
      Number(a.Serial_number) || 0,
      a.location || "",
      a.room || "",
      parseExcelDate(a.receipt_date), // แปลงวันที่
      Number(a.original_value) || 0,
      Number(a.Cost_Center) || 0,
      a.agency || "",
      a.vendor_name || "",
      new Date().getFullYear()
    ]);

    console.log("SQL VALUES ตัวแรก:", values[0]); // debug

    const sql = `
      INSERT INTO asset 
      (Company_Code, asset_number, Subnumber, inventory_number, asset_description, model, Serial_number, location, room, receipt_date, original_value, Cost_Center, agency, vendor_name, YEAR)
      VALUES ?
    `;

    const [result] = await db.query(sql, [values]);
    res.json({ message: "บันทึกสำเร็จ", inserted: result.affectedRows });
  } catch(err) {
    console.error("❌ Backend Error:", err);
    res.status(500).json({ message: "บันทึกไม่สำเร็จ", error: err.message });
  }
});


// ================== GET ALL ASSETS ==================
// เปิดให้ browser โหลดรูปจาก folder uploads
app.use('/uploads', express.static('uploads'));

app.get("/asset", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.asset_id,
        a.asset_number,
        a.asset_description,
        a.location,
        a.room,
        a.notes AS notes,
        DATE_FORMAT(a.receipt_date, '%d/%m/%Y') AS receipt_date,
        DATE_FORMAT(a.inspection_date, '%d/%m/%Y') AS inspection_date,
        CASE a.status
          WHEN 0 THEN 'Lost'
          WHEN 1 THEN 'Normal'
          WHEN 2 THEN 'Damaged'
          ELSE '-'
        END AS status,
        a.photo_url,
        u.email AS auditor   -- ⭐ ดึง email จาก user
      FROM asset a
      LEFT JOIN user u ON a.user_by = u.user_id
      ORDER BY a.asset_id DESC
    `);

    const data = rows.map(r => ({
      ...r,
      photo_url: r.photo_url ? r.photo_url : null
    }));

    res.json(data);
  } catch (err) {
    console.error("❌ Error GET /asset:", err);
    res.status(500).json({ success: false, message: "ไม่สามารถดึงข้อมูล asset ได้" });
  }
});

// ================== NEWS ==================

// GET /news → admin + audit (ตอนนี้ไม่เช็ค token, ใครก็ยิงได้)
app.get("/news", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM news ORDER BY created_at DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error GET /news:", err);
    res.status(500).json({ success: false, message: "ไม่สามารถดึงข่าวได้" });
  }
});

// POST /news → admin (ตอนนี้ยังไม่เช็ค role, แต่ตรง table ของคุณ)
app.post("/news", async (req, res) => {
  try {
    const { title, description, start_date } = req.body;

    if (!title || !start_date) {
      return res.status(400).json({ success: false, message: "กรอกข้อมูลไม่ครบ" });
    }

    const sql = `
      INSERT INTO news (title, description, start_date)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.query(sql, [title, description, start_date]);

    res.json({ 
      success: true, 
      message: "เพิ่มข่าวสำเร็จ", 
      news_id: result.insertId 
    });
  } catch (err) {
    console.error("❌ Error POST /news:", err);
    res.status(500).json({ success: false, message: "ไม่สามารถเพิ่มข่าวได้" });
  }
});

// แก้ไขข่าวตาม news_id
app.put("/news/:id", async (req, res) => {
  try {
    const newsId = req.params.id;
    const { title, description, start_date } = req.body;

    if (!title || !start_date) {
      return res.status(400).json({ success: false, message: "กรอกข้อมูลไม่ครบ" });
    }

    const sql = `
      UPDATE news 
      SET title = ?, description = ?, start_date = ?, updated_at = NOW()
      WHERE news_id = ?
    `;
    const [result] = await db.query(sql, [title, description, start_date, newsId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบข่าวที่ต้องการแก้ไข" });
    }

    res.json({ success: true, message: "แก้ไขข่าวสำเร็จ" });
  } catch (err) {
    console.error("❌ Error PUT /news/:id:", err);
    res.status(500).json({ success: false, message: "ไม่สามารถแก้ไขข่าวได้" });
  }
});

// ลบข่าวตาม news_id
app.delete("/news/:id", async (req, res) => {
  try {
    const newsId = req.params.id;

    const sql = `DELETE FROM news WHERE news_id = ?`;
    const [result] = await db.query(sql, [newsId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบข่าวที่ต้องการลบ" });
    }

    res.json({ success: true, message: "ลบข่าวสำเร็จ" });
  } catch (err) {
    console.error("❌ Error DELETE /news/:id:", err);
    res.status(500).json({ success: false, message: "ไม่สามารถลบข่าวได้" });
  }
});

// ================== Dashboard ==================

// API: นับจำนวน asset ทั้งหมด + แยกตาม status
app.get("/api/asset/count", async (req, res) => {
  try {
    // query ทั้งหมด
    const [totalRows] = await db.query("SELECT COUNT(*) AS total FROM asset");
    const total = totalRows[0].total;

    // query ตาม status
    const [statusRows] = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS lost,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS normal,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS damaged
      FROM asset
    `);

    res.json({
      total,
      status: {
        lost: statusRows[0].lost,
        normal: statusRows[0].normal,
        damaged: statusRows[0].damaged,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// ================== GET ALL LOGS ==================
// GET /asset/logs
app.get('/asset/logs', async (req, res) => {
  try {
    // ไม่ต้องใช้ assetId เพราะอยากเอาทุกรายการ
    const [logs] = await db.query(`
      SELECT 
        l.log_id,
        l.asset_id,
        a.asset_number,   -- ✅ เพิ่ม field นี้
        l.changed_date,
        l.changes,
        u.username AS changed_by_name,
        u.email AS changed_by_email
      FROM logs l
      LEFT JOIN asset a ON l.asset_id = a.asset_id   -- ✅ join ตาราง asset
      LEFT JOIN user u ON l.changed_by = u.user_id
      ORDER BY l.changed_date DESC
    `);

    // แปลง JSON ใน field changes
    const parsedLogs = logs.map(log => ({
      ...log,
      changes: JSON.parse(log.changes),
      changed_by_name: log.changed_by_name || 'Admin',
      changed_by_email: log.changed_by_email || ''
    }));

    res.json(parsedLogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch logs', error: err.message });
  }
});

// ================== GET ASSET BY ID ==================
// GET /asset/:id -> ดึง asset ตาม id
app.get("/asset/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await db.query(`
      SELECT 
        a.asset_id,
        a.Company_Code,
        a.asset_number,
        a.Subnumber,
        a.inventory_number,
        a.asset_description,
        a.model,
        a.Serial_number,
        a.location,
        a.room,
        DATE_FORMAT(a.receipt_date, '%d/%m/%Y') AS receipt_date,
        DATE_FORMAT(a.inspection_date, '%d/%m/%Y') AS inspection_date,
        a.original_value,
        a.Cost_Center,
        a.agency,
        a.vendor_name,
        a.notes,
        a.photo_url,
        CASE a.status
          WHEN 0 THEN 'Lost'
          WHEN 1 THEN 'Normal'
          WHEN 2 THEN 'Damaged'
          ELSE '-'
        END AS status,
        u.email AS auditor   -- ⭐ ดึง email จากตาราง user
      FROM asset a
      LEFT JOIN user u ON a.user_by = u.user_id  -- ✅ join user
      WHERE a.asset_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลครุภัณฑ์" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error GET /asset/:id:", err);
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลครุภัณฑ์ได้" });
  }
});



// ================== แก้รูปภาพ ==================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}.${ext}`);
  }
});
const upload = multer({ storage });


// ================= UPDATE ASSET =================
app.post('/asset/:id/update', upload.single('image'), async (req, res) => {
  try {
    const assetId = req.params.id
    const { location, room, status, notes, inspection_date, email } = req.body

    // 1️⃣ ดึงข้อมูลเก่าก่อน
    const [oldRows] = await db.query('SELECT * FROM asset WHERE asset_id = ?', [assetId])
    if (!oldRows.length) return res.status(404).json({ success: false, message: 'Asset not found' })
    const oldData = oldRows[0]

    const fields = {}
    const changes = {} // object สำหรับ log

    // 2️⃣ map email -> user_id
    let userId = null
    if (email) {
      const [rows] = await db.query('SELECT user_id FROM user WHERE email = ?', [email])
      userId = rows[0] ? rows[0].user_id : null
    }

    // 3️⃣ ตรวจสอบ field ที่แก้ไข
    if (location !== undefined && location !== oldData.location) {
      fields['location'] = location
      changes['location'] = { old: oldData.location, new: location }
    }
    if (room !== undefined && room !== oldData.room) {
      fields['room'] = room
      changes['room'] = { old: oldData.room, new: room }
    }
    if (status !== undefined) {
      const statusMap = { 'Lost': 0, 'Normal': 1, 'Damaged': 2 }
      const newStatus = statusMap[status] ?? 1
      if (newStatus !== oldData.status) {
        fields['status'] = newStatus
        changes['status'] = { old: oldData.status, new: newStatus }
      }
    }
    if (notes !== undefined && notes !== oldData.notes) {
      fields['notes'] = notes
      changes['notes'] = { old: oldData.notes, new: notes }
    }
    if (inspection_date !== undefined && inspection_date !== oldData.inspection_date) {
      fields['inspection_date'] = inspection_date
      changes['inspection_date'] = { old: oldData.inspection_date, new: inspection_date }
    }

    // ถ้ามีรูป upload ใหม่
    if (req.file) {
      fields['photo_url'] = `/uploads/${req.file.filename}`
      changes['photo_url'] = { old: oldData.photo_url, new: `/uploads/${req.file.filename}` }
    }

    // user_by
    if (userId && userId !== oldData.user_by) {
      fields['user_by'] = userId
      changes['user_by'] = { old: oldData.user_by, new: userId }
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่มี field ให้แก้ไข' })
    }

    // 4️⃣ อัพเดต asset
    const setClause = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ')
    const values = Object.values(fields)
    values.push(assetId)
    await db.query(`UPDATE asset SET ${setClause} WHERE asset_id = ?`, values)

    // 5️⃣ บันทึก log ถ้ามีการแก้ไข
    if (Object.keys(changes).length > 0) {
      await db.query(
  'INSERT INTO logs (asset_id, changed_by, changes) VALUES (?, ?, ?)',
  [assetId, userId, JSON.stringify(changes)]
)

    }

    res.json({ success: true, updatedFields: fields, changes })

  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Update failed', error: err.message })
  }
})


// ================== ค้นหา asset_number ==================

app.get("/asset/number/:asset_number", async (req, res) => {
  const asset_number = req.params.asset_number.trim();
  const [rows] = await db.query(`
    SELECT * FROM asset WHERE asset_number = ?
  `, [asset_number]);

  if (rows.length === 0) return res.status(404).json({ message: "ไม่พบข้อมูลครุภัณฑ์" });
  res.json(rows[0]);
});

// ================== Opening Times ==================
app.use(express.json()); // ต้องมี เพื่ออ่าน req.body

// ฟังก์ชันตรวจสอบรูปแบบวันที่ yyyy-mm-dd
function isYMD(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// ฟังก์ชันแปลงวันที่เป็นวันเริ่มต้นและวันสิ้นสุด
function toStartOfDay(dateStr) {
  return dateStr + ' 00:00:00';
}

function toEndOfDay(dateStr) {
  return dateStr + ' 23:59:59';
}

// GET ล่าสุด
app.get('/api/opening_times', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT time_id, open_datetime, close_datetime
       FROM opening_times
       ORDER BY time_id DESC
       LIMIT 1`
    );
    if (rows.length === 0) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/opening_times error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลช่วงเวลาได้' });
  }
});

// POST ใหม่
app.post('/api/opening_times', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'ต้องระบุ startDate และ endDate' });
    }

    if (!isYMD(startDate) || !isYMD(endDate)) {
      return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (yyyy-mm-dd)' });
    }

    if (endDate < startDate) {
      return res.status(400).json({ error: 'วันที่สิ้นสุดต้องไม่เร็วกว่าวันที่เริ่มต้น' });
    }

    // แปลงเป็น datetime สำหรับ MySQL
    const openDT = toStartOfDay(startDate);
    const closeDT = toEndOfDay(endDate);
    const year = new Date().getFullYear();

    console.log('Inserting opening_times:', { openDT, closeDT, year });

    const [result] = await db.execute(
      `INSERT INTO opening_times (open_datetime, close_datetime, year) VALUES (?, ?, ?)`,
      [openDT, closeDT, year]
    );

    res.json({ message: 'บันทึกช่วงเวลาเรียบร้อย', time_id: result.insertId });

  } catch (err) {
    console.error('POST /api/opening_times error:', err);

    // แสดง error จริงจาก MySQL กลับไป Vue
    res.status(500).json({ error: err.message });
  }
});

// DELETE
app.delete('/api/opening_times/:time_id', async (req, res) => {
  try {
    const { time_id } = req.params;
    const [result] = await db.execute(
      `DELETE FROM opening_times WHERE time_id = ?`,
      [time_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'ไม่พบรายการที่ต้องการลบ' });
    res.json({ message: 'ลบรายการเรียบร้อย' });
  } catch (err) {
    console.error('DELETE /api/opening_times/:time_id error:', err);
    res.status(500).json({ error: 'ไม่สามารถลบข้อมูลได้' });
  }
});

// ================== Audit Committee ==================
app.get('/api/audit_committee', async (req, res) => {
    try {
        let { year } = req.query;

        // ถ้าไม่มีส่งมา → ใช้ปีปัจจุบัน
        if (!year) {
            year = new Date().getFullYear(); // ค.ศ.
        } else {
            year = Number(year);
            if (year > 2200) year -= 543; // ถ้าเป็น พ.ศ. แปลงเป็น ค.ศ.
        }

        const [rows] = await db.execute(
            `SELECT user_id, username, role, year, email
             FROM user
             WHERE role = 'Audit Committee' AND year = ? 
             ORDER BY username ASC`,
            [year]
        );

        const result = rows.map(item => {
            let displayName = item.username?.trim() || (item.email ? item.email.split('@')[0] : '');
            return {
                user_id: item.user_id,
                username: displayName,
                position: item.role || 'Audit Committee',
                years: item.year ? Number(item.year) + 543 : null
            };
        });

        res.json(result);
    } catch (err) {
        console.error("Fetch audit committee Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ดึงปีกรรมการทั้งหมด (ไม่ซ้ำ)
app.get('/api/audit-committee/years', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT DISTINCT year FROM user WHERE role = 'Audit Committee' ORDER BY year DESC`
        );
        // แปลงเป็น พ.ศ.
        const years = rows.map(r => r.year + 543);
        res.json(years);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});



// Add audit
app.post('/api/add_audit_committee', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "กรุณาส่ง Email" });

        const currentYear = new Date().getFullYear(); // ค.ศ.
        const [rows] = await db.execute('SELECT * FROM user WHERE email = ?', [email]);
        let user;

        if (rows.length === 0) {
            // สร้างผู้ใช้ใหม่ พร้อมตั้ง role, username และ year
            const [result] = await db.execute(
                'INSERT INTO user (email, username, role, year) VALUES (?, ?, ?, ?)',
                [email, email.split('@')[0], 'Audit Committee', currentYear]
            );
            [user] = await db.execute('SELECT * FROM user WHERE user_id = ?', [result.insertId]);
            user = user[0];
        } else {
            user = rows[0];
            // อัปเดต role และ year สำหรับผู้ใช้เดิม
            await db.execute(
                'UPDATE user SET role = ?, username = ?, year = ? WHERE user_id = ?',
                ['Audit Committee', user.username || email.split('@')[0], currentYear, user.user_id]
            );
        }

        res.json({
            message: 'เพิ่มรายชื่อกรรมการเรียบร้อย',
            user_id: user.user_id,
            email: user.email,
            username: user.username,
            year: currentYear
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});


// De audut
app.delete('/api/audit_committee/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        let { year } = req.query; // เปลี่ยนจาก body → query

        let dbYear = null;
        if (year) {
            dbYear = Number(year);
            if (dbYear > 2200) dbYear -= 543;
        }

        const [times] = await db.execute(
            'SELECT open_datetime, close_datetime FROM opening_times ORDER BY time_id DESC LIMIT 1'
        );

        if (times.length > 0) {
            const now = new Date();
            const start = new Date(times[0].open_datetime);
            if (now >= start) {
                return res.status(400).json({
                    message: `ไม่สามารถลบกรรมการได้ เพราะระบบได้เปิดแล้ว (เริ่ม ${start.toLocaleDateString()})`
                });
            }
        }

        let query = `UPDATE user SET role = NULL, year = NULL WHERE user_id = ? AND role = 'Audit Committee'`;
        let params = [user_id];
        if (dbYear) {
            query += ` AND year = ?`;
            params.push(dbYear);
        }

        const [result] = await db.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "ไม่พบกรรมการที่จะลบ" });
        }

        res.json({ message: "ลบกรรมการเรียบร้อย", user_id, year: dbYear });
    } catch (err) {
        console.error("Delete audit committee Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// Coppy audit
app.post('/api/audit_committee/copy', async (req, res) => {
    try {
        const { user_id, year } = req.body;
        if (!user_id || !year) {
            return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
        }

        let dbYear = Number(year);
        if (dbYear > 2200) dbYear -= 543; // ถ้าเป็น พ.ศ. ให้แปลงเป็น ค.ศ.

        // อัปเดต role และปี
        const [result] = await db.execute(
            `UPDATE user
       SET role = 'Audit Committee', year = ? 
       WHERE user_id = ?`,
            [dbYear, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้" });
        }

        res.json({ message: "คัดลอกรายชื่อเรียบร้อย", user_id, year: dbYear });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});


// ================== START SERVER ==================
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});