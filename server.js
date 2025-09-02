const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const app = express();
app.use(bodyParser.json());

// MongoDB connection
const uri = "mongodb+srv://truzone:<db_password>@cluster0.tutojxn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);
const dbName = "truzoneDB";

// Gmail transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "truzoneverifica564@gmail.com",
    pass: "wuqqzhorrausnirj"
  }
});

// temporary memory store
let tempUsers = {};
let otpStore = {};

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Route: signup request
app.post("/signup", async (req, res) => {
  const { first_name, last_name, email, password, ip_address, device_name } = req.body;

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    // check if email already exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const otp = generateOTP();
    otpStore[email] = otp;
    tempUsers[email] = { first_name, last_name, email, password, ip_address, device_name };

    // send mail
    await transporter.sendMail({
      from: "truzoneverifica564@gmail.com",
      to: email,
      subject: "Truzone Verification Code",
      text: `Your 6-digit verification code is: ${otp}`
    });

    res.json({ success: true, message: "Verification code sent" });
  } catch (err) {
    console.error("Error in /signup:", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

// Route: verify OTP
app.post("/verify", async (req, res) => {
  const { email, otp } = req.body;

  if (!otpStore[email] || otpStore[email] !== otp) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    const userData = tempUsers[email];
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    await users.insertOne({
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      password: hashedPassword,
      ip_address: userData.ip_address,
      device_name: userData.device_name,
      created_at: new Date().toISOString()
    });

    delete tempUsers[email];
    delete otpStore[email];

    res.json({ success: true, message: "User verified and saved" });
  } catch (err) {
    console.error("Error in /verify:", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

// Render/Heroku uses process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Signup backend running on port ${PORT}`);
});