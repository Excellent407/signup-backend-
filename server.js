// ===== server.js (God Service) =====
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ======= MONGODB CONNECTION =======
mongoose.connect(
  "mongodb+srv://truzone:0U4bRfUJPvdBJhS7@cluster0.tutojxn.mongodb.net/Truzone?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log("MongoDB connected (God Server)"))
.catch(err => console.error("MongoDB connection error:", err));

// ======= ID GENERATOR SCHEMA =======
const counterSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model("Counter", counterSchema);

// ======= FUNCTION TO GENERATE CUSTOM IDs =======
async function generateId(type) {
  const prefix = {
    user: "TRU",
    post: "POST",
    reel: "REEL",
    save: "SAVE",
    tag: "TAG",
    share: "SHARE",
    comment: "COMM",
    like: "LIKE",
    sound: "SND",
    follower: "FOL",
    message: "MSG",
    notification: "NTF",
    view: "VIEW",
    report: "RPT",
    activity: "ACT",
    setting: "SET",
    wallet: "WAL",
    transaction: "TXN",
    live: "LIVE"
  }[type] || "GEN";

  const counter = await Counter.findOneAndUpdate(
    { name: type },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}${counter.seq.toString().padStart(6, "0")}`;
}

// ======= ROUTE: GET UNIQUE ID =======
app.get("/id/:type", async (req, res) => {
  try {
    const id = await generateId(req.params.type);
    res.json({ success: true, id });
  } catch (err) {
    console.error("ID generation error:", err);
    res.json({ success: false, message: "Failed to generate ID" });
  }
});

// ======= START SERVER =======
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`God server running on port ${PORT}`));