const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const { MongoClient } = require("mongodb");

const app = express();
app.use(bodyParser.json());

// ====== CONFIG ======
const MONGO_URI = "mongodb+srv://truzone:<db_password>@cluster0.tutojxn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "truzone_db";

// Gmail setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "truzoneverifica564@gmail.com",
    pass: "wuqqzhorrausnirj"
  }
});

// Temporary storage for verification
let tempUsers = {};
let verificationCodes = {};

// ====== BOT 3: Check if email already exists ======
app.post("/check-email", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email required" });

  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const existingUser = await db.collection("users").findOne({ email });

    await client.close();

    if (existingUser) {
      return res.json({ success: false, message: "Email already registered" });
    } else {
      return res.json({ success: true, message: "Email available" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Error checking email" });
  }
});

// ====== BOT 1: Send 6-digit code ======
app.post("/send-code", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email required" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes[email] = code;

  const mailOptions = {
    from: "truzoneverifica564@gmail.com",
    to: email,
    subject: "Your Verification Code",
    text: `Your code is: ${code}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Failed to send code" });
    }
    return res.json({ success: true, message: "Code sent!" });
  });
});

// ====== BOT 2: Hold form temporarily ======
app.post("/hold-form", (req, res) => {
  const { email, first_name, last_name, password, ip_address, device_name } = req.body;

  if (!email) return res.status(400).json({ success: false, message: "Email required" });

  tempUsers[email] = {
    first_name,
    last_name,
    email,
    password,
    ip_address,
    device_name
  };

  return res.json({ success: true, message: "Form saved temporarily" });
});

// ====== Verify code and push to MongoDB ======
app.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) return res.status(400).json({ success: false, message: "Email and code required" });

  if (verificationCodes[email] !== code) {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }

  const userData = tempUsers[email];
  if (!userData) return res.status(400).json({ success: false, message: "No form data found" });

  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // Save user
    await db.collection("users").insertOne({
      ...userData,
      created_at: new Date().toISOString()
    });

    await client.close();

    // cleanup
    delete tempUsers[email];
    delete verificationCodes[email];

    return res.json({ success: true, message: "Signup complete and saved to MongoDB" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

// ====== Start server ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Signup backend running on port ${PORT}`);
});
