// server.js
import express from "express";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

// Parse JSON / form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

/* =========================================================
   MYSQL CONNECTION
   (Uses your GCP MySQL with hangingLibraries DB)
========================================================= */
const db = mysql.createPool({
  host: "34.138.215.83",
  user: "nodeUser",
  password: "M#Kk6U]_/hN2uC|5",
  database: "hangingLibraries", // <-- from your snippet
  ssl: {
	  ca: fs.readFileSync('./genericUserCert/server-ca.pem'),
	  key: fs.readFileSync('./genericUserCert/client-key.pem'),
	  cert: fs.readFileSync('./genericUserCert/client-cert.pem')
  },
  connectionLimit: 10,
});

/* =========================================================
   LOGIN: Email OR Member ID + Password
   Tables: ACCOUNT, STAFF, MEMBER
========================================================= */
app.post("/api/login", (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.json({ success: false });

  // If identifier has "@", treat as email; else as MEMBER_IDNum
  let whereClause;
  let value;
  if (identifier.includes("@")) {
    whereClause = "Pref_EMAIL = ?";
    value = identifier;
  } else {
    whereClause = "MEMBER_IDNum = ?";
    value = identifier;
  }

  const sqlAccount = `
    SELECT *
    FROM ACCOUNT
    WHERE ${whereClause}
    LIMIT 1
  `;

  db.query(sqlAccount, [value], (err, accountRows) => {
    if (err || accountRows.length === 0) {
      console.error("Login error or no account:", err);
      return res.json({ success: false });
    }

    const account = accountRows[0];

    // NOTE: Plaintext comparison, because schema appears to store plain text.
    if (account.Password !== password) {
      return res.json({ success: false });
    }

    const memberId = account.MEMBER_IDNum;

    // Check STAFF to see if this is a staff member
    // Assumes StaffIDNum matches MEMBER_IDNum for staff accounts.
    const sqlStaff = `
      SELECT 1
      FROM STAFF
      WHERE StaffIDNum = ?
      LIMIT 1
    `;
    db.query(sqlStaff, [memberId], (errStaff, staffRows) => {
      if (errStaff) {
        console.error("Staff check error:", errStaff);
        return res.json({ success: false });
      }

      if (staffRows.length > 0) {
        // staff
        return res.json({
          success: true,
          memberId,
          role: "staff",
        });
      }

      // Otherwise treat as member (must exist in MEMBER table)
      const sqlMember = `
        SELECT 1
        FROM MEMBER
        WHERE MEMBER_IDNum = ?
        LIMIT 1
      `;
      db.query(sqlMember, [memberId], (errMem, memRows) => {
        if (errMem) {
          console.error("Member check error:", errMem);
          return res.json({ success: false });
        }

        if (memRows.length === 0) {
          // If no MEMBER row, still return success as member (can adjust if needed)
          return res.json({ success: true, memberId, role: "member" });
        }

        return res.json({
          success: true,
          memberId,
          role: "member",
        });
      });
    });
  });
});

/* =========================================================
   PROFILE: Load from MEMBER + ACCOUNT
========================================================= */
// GET /api/getUserProfile?memberId=123
app.get("/api/getUserProfile", (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.json({ success: false });

  const sql = `
    SELECT
      m.*,
      a.Pref_EMAIL,
      a.Pref_PHONE_NUMBER
    FROM MEMBER m
    LEFT JOIN ACCOUNT a ON m.MEMBER_IDNum = a.MEMBER_IDNum
    WHERE m.MEMBER_IDNum = ?
    LIMIT 1
  `;

  db.query(sql, [memberId], (err, rows) => {
    if (err || rows.length === 0) {
      console.error("getUserProfile error:", err);
      return res.json({ success: false });
    }

    res.json({ success: true, user: rows[0] });
  });
});

// POST /api/editProfile
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

  if (!memberId) return res.json({ success: false });

  // Update ACCOUNT row first
const sqlUpdateAccount = `
  UPDATE ACCOUNT
  SET
    Pref_EMAIL = ?,
    Pref_PHONE_NUMBER = ?,
    Password = IF(? = '', Password, ?)
  WHERE MEMBER_IDNum = ?
`;

db.query(
  sqlUpdateAccount,
  [email || "", phone || "", password || "", password || "", memberId],
  (err2, result) => {
    if (err2) {
      console.error("editProfile ACCOUNT UPDATE error:", err2);
      return res.json({ success: false });
    }

    // If no ACCOUNT row existed, insert one
    if (result.affectedRows === 0) {
      const sqlInsertAccount = `
        INSERT INTO ACCOUNT
          (MEMBER_IDNum, Pref_EMAIL, Pref_PHONE_NUMBER, Password)
        VALUES (?, ?, ?, ?)
      `;

      db.query(
        sqlInsertAccount,
        [memberId, email || "", phone || "", password || ""],
        (err3) => {
          if (err3) {
            console.error("editProfile ACCOUNT INSERT error:", err3);
            return res.json({ success: false });
          }
          return res.json({ success: true });
        }
      );
    } else {
      return res.json({ success: true });
    }
  }
);

});

/* =========================================================
   SEARCH & BROWSE (BOOKS table)
========================================================= */

// GET /api/results?query=...
app.get("/api/results", (req, res) => {
  const query = req.query.query || "";
  const q = `%${query}%`;

  const sql = `
    SELECT *
    FROM BOOKS
    WHERE Title LIKE ?
       OR Author_fName LIKE ?
       OR Author_lName LIKE ?
       OR Publisher LIKE ?
  `;

  db.query(sql, [q, q, q, q], (err, rows) => {
    if (err) {
      console.error("results error:", err);
      return res.json({ success: false });
    }
    res.json({ success: true, data: rows });
  });
});

// GET /api/browse
app.get("/api/browse", (req, res) => {
  const sql = `
    SELECT *
    FROM BOOKS
    ORDER BY Title ASC
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("browse error:", err);
      return res.json({ success: false });
    }
    res.json({ success: true, items: rows });
  });
});

/* =========================================================
   STAFF: MEMBER MANAGEMENT (MEMBER + ACCOUNT)
========================================================= */

// GET /api/staff/member?memberId=...&lastName=...
app.get("/api/staff/member", (req, res) => {
  const { memberId, lastName } = req.query;
  let sql = `
    SELECT
      m.*,
      a.Pref_EMAIL,
      a.Pref_PHONE_NUMBER
    FROM MEMBER m
    LEFT JOIN ACCOUNT a ON m.MEMBER_IDNum = a.MEMBER_IDNum
  `;
  const params = [];

  if (memberId) {
    sql += " WHERE m.MEMBER_IDNum = ?";
    params.push(memberId);
  } else if (lastName) {
    sql += " WHERE m.Last_Name = ?";
    params.push(lastName);
  } else {
    return res.json({ success: false });
  }

  db.query(sql, params, (err, rows) => {
    if (err || rows.length === 0) {
      console.error("staff/member lookup error:", err);
      return res.json({ success: false });
    }

    const m = rows[0];
    res.json({
      success: true,
      member: m,
      summary: `Member #${m.MEMBER_IDNum}: ${m.First_Name || ""} ${m.Last_Name || ""}`,
    });
  });
});

// POST /api/staff/member/update
app.post("/api/staff/member/update", (req, res) => {
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

  if (!memberId) return res.json({ success: false });

  const sqlMember = `
    UPDATE MEMBER
    SET
      First_Name = ?,
      Last_Name = ?,
      Date_of_Birth = ?,
      Street_Address = ?,
      City = ?,
      State = ?,
      Zip_Code = ?
    WHERE MEMBER_IDNum = ?
  `;

  db.query(
    sqlMember,
    [
      firstName || "",
      lastName || "",
      dob || null,
      street || "",
      city || "",
      state || "",
      zip || null,
      memberId,
    ],
    (err) => {
      if (err) {
        console.error("staff/member UPDATE MEMBER error:", err);
        return res.json({ success: false });
      }

      const sqlAccount = `
        INSERT INTO ACCOUNT (MEMBER_IDNum, Pref_EMAIL, Pref_PHONE_NUMBER, Password)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          Pref_EMAIL = VALUES(Pref_EMAIL),
          Pref_PHONE_NUMBER = VALUES(Pref_PHONE_NUMBER),
          Password = IF(VALUES(Password)='', ACCOUNT.Password, VALUES(Password))
      `;

      db.query(
        sqlAccount,
        [memberId, email || "", phone || "", password || ""],
        (err2) => {
          if (err2) {
            console.error("staff/member UPDATE ACCOUNT error:", err2);
            return res.json({ success: false });
          }
          res.json({ success: true });
        }
      );
    }
  );
});

/* =========================================================
   STAFF: BOOK CATALOG (BOOKS)
========================================================= */

// GET /api/staff/book?isbn=...
app.get("/api/staff/book", (req, res) => {
  const { isbn } = req.query;
  if (!isbn) return res.json({ success: false });

  db.query("SELECT * FROM BOOKS WHERE ISBN = ?", [isbn], (err, rows) => {
    if (err || rows.length === 0) {
      console.error("staff/book lookup error:", err);
      return res.json({ success: false });
    }
    res.json({ success: true, book: rows[0] });
  });
});

// POST /api/staff/book/save
app.post("/api/staff/book/save", (req, res) => {
  const {
    isbn,
    title,
    authorFirst,
    authorLast,
    publisher,
    pubDate,
    bookHome,
    inventory,
  } = req.body;

  if (!isbn || !title) return res.json({ success: false });

  const sql = `
    INSERT INTO BOOKS
      (ISBN, Author_fName, Author_lName, Publisher, Date_Published, Book_Home, Book_inventory, Title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      Author_fName = VALUES(Author_fName),
      Author_lName = VALUES(Author_lName),
      Publisher = VALUES(Publisher),
      Date_Published = VALUES(Date_Published),
      Book_Home = VALUES(Book_Home),
      Book_inventory = VALUES(Book_inventory),
      Title = VALUES(Title)
  `;

  db.query(
    sql,
    [
      isbn,
      authorFirst || "",
      authorLast || "",
      publisher || "",
      pubDate || null,
      bookHome || "",
      inventory || 0,
      title,
    ],
    (err) => {
      if (err) {
        console.error("staff/book SAVE error:", err);
        return res.json({ success: false });
      }
      res.json({ success: true, message: "Saved" });
    }
  );
});

/* =========================================================
   STAFF: CHECKOUTS (LOG + MEMBER + BOOKS)
========================================================= */

// GET /api/staff/checkouts
app.get("/api/staff/checkouts", (req, res) => {
  const sql = `
    SELECT
      l.*,
      m.First_Name,
      m.Last_Name,
      b.Title
    FROM LOG l
    LEFT JOIN MEMBER m ON l.Member_IDNum = m.MEMBER_IDNum
    LEFT JOIN BOOKS b ON l.Item_Code = b.ISBN
    ORDER BY l.Due_Date ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("staff/checkouts error:", err);
      return res.json({ success: false });
    }
    res.json({ success: true, items: rows });
  });
});

// POST /api/staff/checkout/return
app.post("/api/staff/checkout/return", (req, res) => {
  const { logId } = req.body;
  if (!logId) return res.json({ success: false });

  db.query("DELETE FROM LOG WHERE Log_ID = ?", [logId], (err) => {
    if (err) {
      console.error("staff/checkout/return error:", err);
      return res.json({ success: false });
    }
    res.json({ success: true });
  });
});

/* =========================================================
   STAFF: WAITLIST (HOLD + MEMBER + BOOKS)
========================================================= */

// GET /api/staff/waitlist?itemCode=...
app.get("/api/staff/waitlist", (req, res) => {
  const { itemCode } = req.query;
  if (!itemCode) return res.json({ success: false });

  const sql = `
    SELECT
      h.*,
      m.First_Name,
      m.Last_Name,
      b.Title
    FROM HOLD h
    LEFT JOIN MEMBER m ON h.MEMBER_IDNum = m.MEMBER_IDNum
    LEFT JOIN BOOKS b ON h.Item_Code = b.ISBN
    WHERE h.Item_Code = ?
    ORDER BY h.Hold_Num ASC
  `;

  db.query(sql, [itemCode], (err, rows) => {
    if (err) {
      console.error("staff/waitlist error:", err);
      return res.json({ success: false });
    }

    res.json({
      success: true,
      items: rows,
      bookTitle: rows[0]?.Title || "",
    });
  });
});

// POST /api/staff/waitlist/add
app.post("/api/staff/waitlist/add", (req, res) => {
  const { itemCode, memberId } = req.body;
  if (!itemCode || !memberId) return res.json({ success: false });

  const sql = `
    INSERT INTO HOLD (MEMBER_IDNum, Item_Code, Hold_Date, End_Hold_Date)
    VALUES (?, ?, CURDATE(), NULL)
  `;

  db.query(sql, [memberId, itemCode], (err) => {
    if (err) {
      console.error("staff/waitlist/add error:", err);
      return res.json({ success: false });
    }
    res.json({ success: true });
  });
});

// POST /api/staff/waitlist/remove
app.post("/api/staff/waitlist/remove", (req, res) => {
  const { holdNum } = req.body;
  if (!holdNum) return res.json({ success: false });

  db.query("DELETE FROM HOLD WHERE Hold_Num = ?", [holdNum], (err) => {
    if (err) {
      console.error("staff/waitlist/remove error:", err);
      return res.json({ success: false });
    }
    res.json({ success: true });
  });
});

/* =========================================================
   ROOT: Serve home page
========================================================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================================================
   START SERVER
========================================================= */
app.listen(80, () => {
  console.log("✔ Server running on port 80");
});

