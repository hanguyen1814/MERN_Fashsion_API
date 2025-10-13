require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/v1", require("./routes"));

app.use(require("./middlewares/error"));

connectDB(process.env.MONGO_URI)
  .then(() =>
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running at http://localhost:${process.env.PORT}`);
    })
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
