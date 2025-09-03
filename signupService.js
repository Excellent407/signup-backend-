// ===== signupService.js =====
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ======= MONGODB CONNECTION =======
mongoose.connect(
  "mongodb+srv://truzone:0U4bRfUJPvdBJhS7@cluster0.tutojxn.mongodb.net/Truzone?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log("MongoDB connected (Signup Service)"))
.catch(err => console.error("MongoDB connection error:", err));

// ======= USER SCHEMA =======
const userSchema = new mongoose.Schema({
  custom_id: String,
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
    pass: "wuqqzhorrausnirj" // ⚠️ remember: better to move this to .env file
  }
});

// ======= ROUTES =======
app.post("/signup", async (req, res) => {
  const { first_name, last_name, email, password, ip_address, device_name } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.json({ success: false, message: "Email already in use" });

    const code = Math.floor(100000 + Math.random() * 900000);
    tempUsers[email] = { first_name, last_name, email, password, ip_address, device_name, code };

    const mailOptions = {
      from: '"Truzone Verification" <truzoneverifica564@gmail.com>',
      to: email,
      subject: "Your Truzone Verification Code",
      text: `Hey there! 👋

Welcome to Truzone – the place where your vibe meets your tribe!  
Your exclusive verification code is: ${code} ✅  

Pop this code into the app to get started. Hurry, it’s valid for 10 minutes only! ⏰  

If you didn’t sign up, just ignore this message.  

Can’t wait to see you on Truzone! 🚀💖  

Cheers,  
The Truzone Team`
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Verification code sent" });
  } catch (err) {
    console.error("Signup error:", err);
    res.json({ success: false, message: "Failed to signup" });
  }
});

app.post("/verify", async (req, res) => {
  const { email, code } = req.body;
  const tempUser = tempUsers[email];
  if (!tempUser) return res.json({ success: false, message: "No signup found for this email" });

  if (parseInt(code) === tempUser.code) {
    try {
      // === Ask God server for unique ID ===
      const response = await axios.get("http://localhost:10000/id/user"); // change to deployed God server URL in production
      const customId = response.data.id;

      const newUser = new User({
        custom_id: customId,
        first_name: tempUser.first_name,
        last_name: tempUser.last_name,
        email: tempUser.email,
        password: tempUser.password,
        ip_address: tempUser.ip_address,
        device_name: tempUser.device_name
      });

      await newUser.save();
      delete tempUsers[email];
      res.json({ success: true, message: "Email verified, user registered", id: customId });
    } catch (err) {
      console.error("DB save error:", err);
      res.json({ success: false, message: "Failed to save user" });
    }
  } else {
    res.json({ success: false, message: "Invalid verification code" });
  }
});

// ======= START SERVER =======
const PORT = process.env.PORT || 11000;
app.listen(PORT, () => console.log(`Signup service running on port ${PORT}`));