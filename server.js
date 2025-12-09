// server.js
import express from "express";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

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
   IMAGE UPLOAD (multer)
===================================================== */
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

function loadDefaultImage() {
  return fs.readFileSync(
    path.join(__dirname, "public/images/noimg.jpeg")
  );
}

/* =====================================================
   AUTH / LOGIN
===================================================== */
app.post("/api/login", (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.json({ success: false });

  const whereClause = identifier.includes("@")
    ? "Pref_EMAIL = ?"
    : "MEMBER_IDNum = ?";

  db.query(
    `SELECT * FROM ACCOUNT WHERE ${whereClause} LIMIT 1`,
    [identifier],
    (err, rows) => {
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
    }
  );
});

/* =====================================================
   PROFILE
===================================================== */
app.get("/api/getUserProfile", (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.json({ success: false });

  db.query(
    `
    SELECT m.*, a.Pref_EMAIL, a.Pref_PHONE_NUMBER
    FROM MEMBER m
    LEFT JOIN ACCOUNT a ON m.MEMBER_IDNum = a.MEMBER_IDNum
    WHERE m.MEMBER_IDNum = ?
    LIMIT 1
  `,
    [memberId],
    (err, rows) => {
      if (err || rows.length === 0) return res.json({ success: false });
      res.json({ success: true, user: rows[0] });
    }
  );
});

app.post("/api/editProfile", (req, res) => {
  const {
    memberId, firstName, lastName, dob,
    street, city, state, zip,
    email, phone, password
  } = req.body;

  db.query(
    `
    UPDATE MEMBER
    SET First_Name=?, Last_Name=?, Date_of_Birth=?,
        Street_Address=?, City=?, State=?, Zip_Code=?
    WHERE MEMBER_IDNum=?
  `,
    [firstName, lastName, dob, street, city, state, zip, memberId],
    () => {
      db.query(
        `
        UPDATE ACCOUNT
        SET Pref_EMAIL=?, Pref_PHONE_NUMBER=?,
            Password=IF(?='', Password, ?)
        WHERE MEMBER_IDNum=?
      `,
        [email, phone, password, password, memberId],
        (err, result) => {
          if (result.affectedRows === 0) {
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
   BROWSE & SEARCH
===================================================== */
app.get("/api/browse", (req, res) => {
  db.query(
    `SELECT ISBN, Title, Author_fName, Author_lName,
            Book_Home, Book_inventory FROM BOOKS ORDER BY Title`,
    (_, rows) => res.json({ success: true, items: rows })
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
    (_, rows) => res.json({ success: true, data: rows })
  );
});

/* =====================================================
   STAFF: BOOK LOOKUP & SAVE (✅ NEW)
===================================================== */
app.get("/api/staff/book", (req, res) => {
  db.query(
    `SELECT * FROM BOOKS WHERE ISBN = ? LIMIT 1`,
    [req.query.isbn],
    (_, rows) =>
      res.json({ success: true, book: rows[0] || null })
  );
});

app.post("/api/staff/book/save", upload.single("cover"), (req, res) => {
  const {
    isbn, title, authorFirst, authorLast,
    publisher, pubDate, bookHome, inventory
  } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;
  const imageMime = req.file ? req.file.mimetype.split("/")[1] : null;

  db.query(
    `
    INSERT INTO BOOKS
      (ISBN, Title, Author_fName, Author_lName, Publisher,
       Date_Published, Book_Home, Book_inventory,
       coverImage, imageMime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      Title=VALUES(Title),
      Author_fName=VALUES(Author_fName),
      Author_lName=VALUES(Author_lName),
      Publisher=VALUES(Publisher),
      Date_Published=VALUES(Date_Published),
      Book_Home=VALUES(Book_Home),
      Book_inventory=VALUES(Book_inventory),
      coverImage=IFNULL(VALUES(coverImage), coverImage),
      imageMime=IFNULL(VALUES(imageMime), imageMime)
  `,
    [
      isbn, title, authorFirst, authorLast,
      publisher, pubDate || null, bookHome,
      inventory || 0, imageBuffer, imageMime
    ],
    () => res.json({ success: true })
  );
});

app.get("/api/book/cover/:isbn", (req, res) => {
  db.query(
    `SELECT coverImage, imageMime FROM BOOKS WHERE ISBN = ?`,
    [req.params.isbn],
    (_, rows) => {
      if (!rows[0]?.coverImage) {
        res.set("Content-Type", "image/jpeg");
        return res.send(loadDefaultImage());
      }
      res.set("Content-Type", `image/${rows[0].imageMime}`);
      res.send(rows[0].coverImage);
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
      if (rows[0].Book_inventory <= 0)
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
   START SERVER
===================================================== */
app.listen(80, () => {
  console.log("✅ Server running on port 80");
});
