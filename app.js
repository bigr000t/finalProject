
require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");

// 미들웨어
const { setUser } = require("./middleware/auth");

// 라우터
const authRouter = require("./routes/auth");
const communityRouter = require("./routes/community");
const leaderboardRouter = require("./routes/leaderboard");
const saveRouter = require("./routes/save");

const app = express();
const PORT = Number(process.env.PORT || 3000);


// ==================== 기본 설정 ====================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


// ==================== 세션 설정 ====================

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));


// ==================== 미들웨어 등록 ====================

app.use(setUser);


// ==================== 라우터 등록 ====================

app.use("/", authRouter);
app.use("/", communityRouter);
app.use("/", leaderboardRouter);
app.use("/", saveRouter);


// ==================== 메인 페이지 ====================

app.get("/", (req, res) => {
  res.render("index");
});


// ==================== 서버 실행 ====================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Open http://localhost:${PORT}`);
});
