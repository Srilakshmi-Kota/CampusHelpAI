import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User, Ticket } from "./models.js";
import { authenticate, requireAdmin } from "./middleware.js";
import { faqs } from "./faqData.js";
import { answerQuestion } from "./agent.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "20kb" }));

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}
function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
}
function makeTicketCode() {
  return "CH-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

app.get("/api/health", (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({ message: "Enter a name, valid email, and password of at least 8 characters." });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: "student" });
    return res.status(201).json({ token: signToken(user), user: safeUser(user) });
  } catch (err) { next(err); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (err) { next(err); }
});

app.get("/api/auth/me", authenticate, (req, res) => res.json({ user: safeUser(req.user) }));
app.get("/api/faqs", authenticate, (_req, res) => res.json({ faqs }));

app.post("/api/agent/chat", authenticate, (req, res) => {
  const message = String(req.body.message || "").slice(0, 1200);
  res.json({ ...answerQuestion(message), mode: "rule-based FAQ assistant" });
});

app.post("/api/tickets", authenticate, async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const categories = ["IT Support", "Academics", "Examinations", "Facilities", "Accounts", "Other"];
    const priorities = ["Low", "Medium", "High"];
    if (title.length < 4 || description.length < 8) return res.status(400).json({ message: "Add a title (at least 4 characters) and description (at least 8 characters)." });
    const ticket = await Ticket.create({
      ticketCode: makeTicketCode(), title, description,
      category: categories.includes(req.body.category) ? req.body.category : "Other",
      priority: req.user.role === "admin" && priorities.includes(req.body.priority) ? req.body.priority : "Medium",
      student: req.user._id, studentName: req.user.name, studentEmail: req.user.email
    });
    res.status(201).json({ ticket });
  } catch (err) {
    if (err?.code === 11000) {
      try {
        const ticket = await Ticket.create({ ...req.body, ticketCode: makeTicketCode(), student: req.user._id, studentName: req.user.name, studentEmail: req.user.email });
        return res.status(201).json({ ticket });
      } catch (e) { return next(e); }
    }
    next(err);
  }
});

app.get("/api/tickets", authenticate, async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { student: req.user._id };
    const tickets = await Ticket.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json({ tickets });
  } catch (err) { next(err); }
});

app.patch("/api/tickets/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const updates = {};
    if (["Open", "In Progress", "Resolved"].includes(req.body.status)) updates.status = req.body.status;
    if (["Low", "Medium", "High"].includes(req.body.priority)) updates.priority = req.body.priority;
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });
    res.json({ ticket });
  } catch (err) { next(err); }
});

app.get("/api/stats", authenticate, async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { student: req.user._id };
    const [total, open, progress, resolved] = await Promise.all([
      Ticket.countDocuments(filter), Ticket.countDocuments({ ...filter, status: "Open" }),
      Ticket.countDocuments({ ...filter, status: "In Progress" }), Ticket.countDocuments({ ...filter, status: "Resolved" })
    ]);
    res.json({ total, open, inProgress: progress, resolved });
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === 11000) return res.status(409).json({ message: "A record with this value already exists." });
  res.status(500).json({ message: "Server error. Check the server terminal and MongoDB Atlas connection." });
});

async function start() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing. Copy .env.example to .env and configure MongoDB Atlas.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters long.");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 12000 });
  console.log("MongoDB Atlas connected.");
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");
  if (adminEmail && adminPassword) {
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      await User.create({
        name: process.env.ADMIN_NAME || "CampusHelp Administrator",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "admin"
      });
      console.log(`Initial admin account created for ${adminEmail}.`);
    } else if (existing.role !== "admin") {
      console.warn("ADMIN_EMAIL exists as a non-admin account. Choose a different ADMIN_EMAIL in .env.");
    }
  }
  app.listen(PORT, () => console.log(`CampusHelp AI API running at http://localhost:${PORT}`));
}
start().catch(err => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
