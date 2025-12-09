// server.js
import express from "express";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

/* =====================================================
   BASIC CONFIG
===================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

/* =====================================================
   DATABASE CONNECTION
===================================================== */
const db = mysql.createPool({
  host: "34.138.215.83",
  user: "nodeUser",
  password: "M#Kk6U]_/hN2uC|5",
  database: "hangingLibraries",
  ssl: {
    ca: fs.readFileSync("./genericUserCert/server-ca.pem"),
    key: fs.readFileSync("./genericUserCert/client-key.pem"),
    cert: fs.readFileSync("./genericUserCert/client-cert.pem"),
  },
});

/* =====================================================
   AUTH / LOGIN
===================================================== */
app.post("/api/login", (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.json({ success: false });

  const whereClause = identifier.includes("@")
    ? "Pref_EMAIL = ?"
    : "MEMBER_IDNum = ?";

  const sql = `
    SELECT *
    FROM ACCOUNT
    WHERE ${whereClause}
    LIMIT 1
  `;

  db.query(sql, [identifier], (err, rows) => {
    if (err || rows.length === 0) return res.json({ success: false });

    const acct = rows[0];
    if (acct.Password !== password) return res.json({ success: false });

    const memberId = acct.MEMBER_IDNum;

    const staffCheck = `
      SELECT 1 FROM ADMINS WHERE AdminIDNum = ?
      UNION
      SELECT 1 FROM STAFF WHERE StaffIDNum = ?
      LIMIT 1
    `;

    db.query(staffCheck, [memberId, memberId], (err2, staffRows) => {
      if (err2) return res.json({ success: false });

      res.json({
        success: true,
        memberId,
        role: staffRows.length ? "staff" : "member",
      });
    });
  });
});

/* =====================================================
   PROFILE
===================================================== */
app.get("/api/getUserProfile", (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.json({ success: false });

  const sql = `
    SELECT m.*, a.Pref_EMAIL, a.Pref_PHONE_NUMBER
    FROM MEMBER m
    LEFT JOIN ACCOUNT a ON m.MEMBER_IDNum = a.MEMBER_IDNum
    WHERE m.MEMBER_IDNum = ?
    LIMIT 1
  `;

  db.query(sql, [memberId], (err, rows) => {
    if (err || rows.length === 0) return res.json({ success: false });
    res.json({ success: true, user: rows[0] });
  });
});

app.post("/api/editProfile", (req, res) => {
  const {
    memberId,
    firstName,
    lastName,
    dob,
    street,
    city,
    state,
    zip,
    email,
    phone,
    password,
  } = req.body;

  const updateMember = `
    UPDATE MEMBER
    SET First_Name=?, Last_Name=?, Date_of_Birth=?,
        Street_Address=?, City=?, State=?, Zip_Code=?
    WHERE MEMBER_IDNum=?
  `;

  db.query(
    updateMember,
    [firstName, lastName, dob, street, city, state, zip, memberId],
    () => {
      const updateAcct = `
        UPDATE ACCOUNT
        SET Pref_EMAIL=?, Pref_PHONE_NUMBER=?,
            Password=IF(?='', Password, ?)
        WHERE MEMBER_IDNum=?
      `;

      db.query(
        updateAcct,
        [email, phone, password, password, memberId],
        (err, result) => {
          if (result && result.affectedRows === 0) {
            db.query(
              `
              INSERT INTO ACCOUNT
              (MEMBER_IDNum, Pref_EMAIL, Pref_PHONE_NUMBER, Password)
              VALUES (?, ?, ?, ?)
            `,
              [memberId, email, phone, password]
            );
          }
          res.json({ success: true });
        }
      );
    }
  );
});

/* =====================================================
   IMAGE API
===================================================== */
app.get("/api/book/cover/:isbn", (req, res) => {
  const fallbackPath = path.join(__dirname, "public", "images", "noimg.jpg");

  db.query(
    `SELECT coverImage, imageMime FROM BOOKS WHERE ISBN = ?`,
    [req.params.isbn],
    (err, rows) => {
      if (err || !rows.length || !rows[0].coverImage) {
        return res.sendFile(fallbackPath);
      }

      res.set("Content-Type", `image/${rows[0].imageMime || "jpeg"}`);
      res.send(rows[0].coverImage);
    }
  );
});

/* =====================================================
   BROWSE & SEARCH
===================================================== */
app.get("/api/browse", (_, res) => {
  db.query(
    `
    SELECT ISBN, Title, Author_fName, Author_lName,
           Book_Home, Book_inventory
    FROM BOOKS
    ORDER BY Title
    `,
    (err, rows) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, items: rows });
    }
  );
});

app.get("/api/results", (req, res) => {
  const q = `%${req.query.query}%`;

  db.query(
    `
    SELECT ISBN, Title, Author_fName, Author_lName,
           Book_Home, Book_inventory
    FROM BOOKS
    WHERE Title LIKE ? OR Author_fName LIKE ? OR Author_lName LIKE ?
    `,
    [q, q, q],
    (err, rows) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, data: rows });
    }
  );
});

/* =====================================================
   CHECKOUT SYSTEM
===================================================== */
app.post("/api/staff/checkout", (req, res) => {
  const { memberId, isbn } = req.body;

  db.query(
    `SELECT Book_inventory FROM BOOKS WHERE ISBN=?`,
    [isbn],
    (_, rows) => {
      if (!rows || rows[0].Book_inventory <= 0)
        return res.json({ success: false });

      db.query(
        `
        INSERT INTO LOG
        (Member_IDNum, Item_Code, Checkout_Date, Due_Date)
        VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))
        `,
        [memberId, isbn],
        () => {
          db.query(
            `UPDATE BOOKS SET Book_inventory = Book_inventory - 1 WHERE ISBN=?`,
            [isbn]
          );
          res.json({ success: true });
        }
      );
    }
  );
});

/* =====================================================
   STAFF CHECKOUTS (OLD — RENAMED ONLY)
===================================================== */
app.get("/api/staff/checkouts_old", (_, res) => {
  db.query(
    `
    SELECT l.Log_ID, l.Member_IDNum, b.Title,
           l.Checkout_Date, l.Due_Date
    FROM LOG l
    JOIN BOOKS b ON l.Item_Code = b.ISBN
    `,
    (_, rows) => res.json({ success: true, items: rows })
  );
});

/* =====================================================
   STAFF CHECKOUTS (ACTIVE — WITH MEMBER NAMES)
===================================================== */
app.get("/api/staff/checkouts", (req, res) => {
  const sql = `
    SELECT
      l.Log_ID,
      l.Member_IDNum,
      m.First_Name,
      m.Last_Name,
      l.Item_Code AS ISBN,
      b.Title,
      l.Checkout_Date,
      l.Due_Date
    FROM LOG l
    JOIN BOOKS b ON l.Item_Code = b.ISBN
    JOIN MEMBER m ON l.Member_IDNum = m.MEMBER_IDNum
    ORDER BY l.Due_Date
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, items: rows });
  });
});

app.post("/api/staff/checkout/return", (req, res) => {
  const { logId } = req.body;

  db.query(
    `SELECT Item_Code FROM LOG WHERE Log_ID=?`,
    [logId],
    (_, rows) => {
      db.query(
        `DELETE FROM LOG WHERE Log_ID=?`,
        [logId],
        () => {
          db.query(
            `UPDATE BOOKS SET Book_inventory = Book_inventory + 1 WHERE ISBN=?`,
            [rows[0].Item_Code]
          );
          res.json({ success: true });
        }
      );
    }
  );
});

/* =====================================================
   USER CHECKOUTS
===================================================== */
app.get("/api/my/checkouts", (req, res) => {
  db.query(
    `
    SELECT b.Title, l.Item_Code AS ISBN,
           l.Checkout_Date, l.Due_Date
    FROM LOG l
    JOIN BOOKS b ON l.Item_Code = b.ISBN
    WHERE l.Member_IDNum=?
    `,
    [req.query.memberId],
    (_, rows) => res.json({ success: true, items: rows })
  );
});

/* =====================================================
   STAFF: GET BOOK BY ISBN
===================================================== */
app.get("/api/staff/book/:isbn", (req, res) => {
  db.query(
    `
    SELECT ISBN, Title, Author_fName, Author_lName,
           Book_Home, Book_inventory,
           coverImage IS NOT NULL AS hasImage,
           imageMime
    FROM BOOKS
    WHERE ISBN = ?
    LIMIT 1
    `,
    [req.params.isbn],
    (err, rows) => {
      if (err || !rows.length) return res.json({ success: false });
      res.json({ success: true, book: rows[0] });
    }
  );
});

/* =====================================================
   STAFF: GET MEMBER
===================================================== */
app.get("/api/staff/member/:id", (req, res) => {
  const sql = `
    SELECT *
    FROM MEMBER
    WHERE MEMBER_IDNum = ?
    LIMIT 1
  `;

  db.query(sql, [req.params.id], (err, rows) => {
    if (err || rows.length === 0) return res.json({ success: false });
    res.json({ success: true, member: rows[0] });
  });
});

/* =====================================================
   STAFF: UPDATE MEMBER
===================================================== */
app.post("/api/staff/member/save", (req, res) => {
  const {
    memberId, firstName, lastName,
    dob, street, city, state, zip
  } = req.body;

  const sql = `
    UPDATE MEMBER
    SET First_Name=?, Last_Name=?, Date_of_Birth=?,
        Street_Address=?, City=?, State=?, Zip_Code=?
    WHERE MEMBER_IDNum=?
  `;

  db.query(
    sql,
    [firstName, lastName, dob, street, city, state, zip, memberId],
    (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

/* =====================================================
   START SERVER
===================================================== */
app.listen(80, () => {
  console.log("Server running on port 80");
});
