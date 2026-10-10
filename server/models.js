import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["student", "admin"], default: "student" }
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  ticketCode: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  category: { type: String, enum: ["IT Support", "Academics", "Examinations", "Facilities", "Accounts", "Other"], default: "Other" },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  status: { type: String, enum: ["Open", "In Progress", "Resolved"], default: "Open" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Ticket = mongoose.model("Ticket", ticketSchema);
