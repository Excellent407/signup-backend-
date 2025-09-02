const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ======= MONGODB CONNECTION =======
mongoose.connect(
  "mongodb+srv://truzone:0U4bRfUJPvdBJhS7@cluster0.tutojxn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// ======= USER SCHEMA =======
const userSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: { type: String, unique: true },
  password: String,
  ip_address: String,
  device_name: String,
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

// ======= TEMPORARY STORAGE =======
const tempUsers = {};

// ======= EMAIL SETUP =======
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "truzoneverifica564@gmail.com",
    pass: "wuqqzhorrausnirj"
  }
});

// ======= ROUTES =======

app.post("/signup", async (req, res) => {
  const { first_name, last_name, email, password, ip_address, device_name } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.json({ success: false, message: "Email already in use" });

  const code = Math.floor(100000 + Math.random() * 900000);
  tempUsers[email] = { first_name, last_name, email, password, ip_address, device_name, code };

  const mailOptions = {
    from: '"Truzone Verification" <truzoneverifica564@gmail.com>',
    to: email,
    subject: "Your Truzone Verification Code",
    text: `Your 6-digit verification code is: ${code}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Verification code sent" });
  } catch (err) {
    console.error("Email error:", err);
    res.json({ success: false, message: "Failed to send email" });
  }
});

app.post("/verify", async (req, res) => {
  const { email, code } = req.body;
  const tempUser = tempUsers[email];
  if (!tempUser) return res.json({ success: false, message: "No signup found for this email" });

  if (parseInt(code) === tempUser.code) {
    const newUser = new User({
      first_name: tempUser.first_name,
      last_name: tempUser.last_name,
      email: tempUser.email,
      password: tempUser.password,
      ip_address: tempUser.ip_address,
      device_name: tempUser.device_name
    });

    try {
      await newUser.save();
      delete tempUsers[email];
      res.json({ success: true, message: "Email verified, user registered" });
    } catch (err) {
      console.error("DB save error:", err);
      res.json({ success: false, message: "Failed to save user" });
    }
  } else {
    res.json({ success: false, message: "Invalid verification code" });
  }
});

// ======= START SERVER =======
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Signup backend running on port ${PORT}`));