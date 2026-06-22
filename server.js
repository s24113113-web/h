require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");

const User = require("./models/User");
const Account = require("./models/Account");

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

// DB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// auth middleware
function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "請先登入" });
  }
  next();
}

// register
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const exist = await User.findOne({ username });
    if (exist) return res.status(400).json({ message: "帳號已存在" });

    const hash = await bcrypt.hash(password, 10);

    await User.create({
      username,
      password: hash
    });

    res.json({ message: "註冊成功" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "帳號不存在" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "密碼錯誤" });

    req.session.userId = user._id;

    res.json({ message: "登入成功" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "登出成功" });
  });
});

// get accounts
app.get("/api/accounts", isAuthenticated, async (req, res) => {
  const data = await Account.find({
    userId: req.session.userId
  });

  res.json(data);
});

// add account
app.post("/api/accounts", isAuthenticated, async (req, res) => {
  try {
    const { item, amount } = req.body;

    const result = await Account.create({
      item,
      amount,
      userId: req.session.userId
    });

    res.json(result);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

// delete account
app.delete("/api/accounts/:id", isAuthenticated, async (req, res) => {
  await Account.deleteOne({
    _id: req.params.id,
    userId: req.session.userId
  });

  res.json({ message: "刪除成功" });
});

// redirect
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});