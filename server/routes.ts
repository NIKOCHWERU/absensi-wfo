import express, { type Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import multer from "multer";
import { uploadFile } from "./services/googleDrive";
import { User as DbUser } from "@shared/schema";
import fs from "fs";
import path from "path";

declare global {
  namespace Express {
    interface User extends DbUser { }
  }
}

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Object Storage routes
  registerObjectStorageRoutes(app);

  // Setup Auth
  setupAuth(app);

  // Helper to handle photo upload
  async function handlePhotoUpload(
    req: Request,
    actionType: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut'
  ): Promise<string | undefined> {
    console.log(`[handlePhotoUpload] Action: ${actionType}, Method: ${req.file ? 'Multipart' : 'Base64'}`);

    if (req.file) {
      // Multipart upload
      const result = await uploadFile(
        req.file.buffer,
        `attendance-${Date.now()}-${req.file.originalname}`,
        req.file.mimetype,
        {
          employeeName: (req.user as DbUser).fullName,
          actionType: actionType,
          timestamp: new Date()
        }
      );
      console.log(`[handlePhotoUpload] Multipart upload success: ${result.fileId}`);
      return result.fileId;
    } else if (req.body.checkInPhoto && req.body.checkInPhoto.startsWith('data:image')) {
      console.log(`[handlePhotoUpload] Base64 data length: ${req.body.checkInPhoto.length}`);
      // Base64 upload
      const matches = req.body.checkInPhoto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const result = await uploadFile(
          buffer,
          `attendance-${Date.now()}.png`,
          type,
          {
            employeeName: (req.user as DbUser).fullName,
            actionType: actionType,
            timestamp: new Date()
          }
        );
        console.log(`[handlePhotoUpload] Base64 upload success: ${result.fileId}`);
        return result.fileId;
      }
    }
    console.warn(`[handlePhotoUpload] No photo data found in request payload for ${actionType}`);
    return undefined;
  }

  // --- Attendance Routes ---

  // Helper date function for Jakarta Timezone
  function getJakartaDate(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // Returns YYYY-MM-DD
  }

  // --- Attendance Routes ---

  app.post(api.attendance.clockIn.path, upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const today = getJakartaDate();
      const userId = req.user!.id;

      // Check existing sessions for today
      const existingSessions = await storage.getAttendanceSessionsByUserAndDate(userId, today);
      const activeSession = existingSessions.find(s => !s.checkOut);

      if (activeSession) {
        return res.status(400).json({ message: "Sesi sebelumnya belum selesai (belum absen pulang)." });
      }

      const nextSessionNumber = existingSessions.length + 1;

      const photoFileId = await handlePhotoUpload(req, 'clockIn');
      const location = req.body.location;

      const shift = "Management"; // Default shift name
      const shiftType = req.body.shiftType || 'Regular'; // 'Regular' or 'Piket'

      // Determine status based on Shift Rules
      const now = new Date();
      // Using Jakarta Time for calculation
      const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const hour = jakartaTime.getHours();
      const minute = jakartaTime.getMinutes();
      const timeInMinutes = hour * 60 + minute;
      const dayOfWeek = jakartaTime.getDay(); // 0 = Sunday, 6 = Saturday

      // Indonesian Public Holidays 2026 (simplified)
      const holidaysString = [
        "2026-01-01", // Tahun Baru
        "2026-01-29", // Tahun Baru Imlek
        "2026-02-16", // Isra Mikraj
        "2026-03-20", // Hari Suci Nyepi
        "2026-04-03", // Wafat Isa Almasih
        "2026-04-05", // Hari Paskah
        "2026-04-30", // Hari Raya Idul Fitri
        "2026-05-01", // Hari Buruh
        "2026-05-21", // Hari Kenaikan Isa Almasih
        "2026-05-22", // Hari Raya Waisak
        "2026-06-01", // Hari Lahir Pancasila
        "2026-06-06", // Idul Adha
        "2026-07-06", // Tahun Baru Islam
        "2026-08-17", // Hari Kemerdekaan RI
        "2026-09-14", // Maulid Nabi Muhammad
        "2026-12-25", // Hari Raya Natal
      ];

      let status = "present";
      let isOvertime = false;
      let notes = "";

      // Holiday / Weekend Logic
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidaysString.includes(today);

      // --- Piket Schedule Check ---
      const schedule = await storage.getPiketSchedules(today.substring(0, 7));
      const myPiketToday = schedule.find(s => s.userId === userId && s.date === today);

      let finalShiftType = shiftType || (myPiketToday ? 'Piket' : 'Regular');

      if (isWeekend || isHoliday) {
        status = "overtime";
        isOvertime = true;
        notes = isHoliday ? "Hari Libur Nasional" : "Hari Libur Pekan";
      } else {
        // Normal Day Logic
        let deadlineMinutes = 8 * 60 + 30; // 08:30 Default

        if (finalShiftType === 'Piket') {
          deadlineMinutes = 8 * 60 + 15; // 08:15 for Piket
        }

        if (timeInMinutes > deadlineMinutes) {
          status = "late";
        }
      }

      const attendance = await storage.createAttendance({
        userId,
        date: today,
        checkIn: now,
        status: status,
        checkInPhoto: photoFileId,
        checkInLocation: location,
        shift: shift,
        shiftType: finalShiftType,
        isOvertime: isOvertime,
        sessionNumber: nextSessionNumber,
        notes: notes
      });

      res.json(attendance);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: (err as Error).message || "Internal Server Error" });
    }
  });

  app.post(api.attendance.clockOut.path, upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const today = getJakartaDate();
    const userId = req.user!.id;
    const existing = await storage.getAttendanceByUserAndDate(userId, today);

    if (!existing) {
      return res.status(400).json({ message: "No check-in record found for today" });
    }

    const photoFileId = await handlePhotoUpload(req, 'clockOut');
    const location = req.body.location;

    const attendance = await storage.updateAttendance(existing.id, {
      checkOut: new Date(),
      checkOutPhoto: photoFileId,
      checkOutLocation: location,
    });

    res.json(attendance);
  });

  app.post(api.attendance.breakStart.path, upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const today = getJakartaDate();
    const userId = req.user!.id;
    const existing = await storage.getAttendanceByUserAndDate(userId, today);

    if (!existing) {
      return res.status(400).json({ message: "No check-in record found for today" });
    }

    const photoFileId = await handlePhotoUpload(req, 'breakStart');
    const location = req.body.location;

    const attendance = await storage.updateAttendance(existing.id, {
      breakStart: new Date(),
      breakStartPhoto: photoFileId,
      breakStartLocation: location,
    });

    res.json(attendance);
  });

  app.post(api.attendance.breakEnd.path, upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const today = getJakartaDate();
    const userId = req.user!.id;
    const existing = await storage.getAttendanceByUserAndDate(userId, today);

    if (!existing) {
      return res.status(400).json({ message: "No check-in record found for today" });
    }

    const photoFileId = await handlePhotoUpload(req, 'breakEnd');
    const location = req.body.location;

    const attendance = await storage.updateAttendance(existing.id, {
      breakEnd: new Date(),
      breakEndPhoto: photoFileId,
      breakEndLocation: location,
    });

    res.json(attendance);
  });

  app.post(api.attendance.permit.path, upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { notes, type } = req.body;
    const today = getJakartaDate();
    const userId = req.user!.id;

    const existing = await storage.getAttendanceByUserAndDate(userId, today);

    // Upload photo if provided
    const photoFileId = await handlePhotoUpload(req, 'clockIn');
    const now = new Date();

    if (existing) {
      // If already working, this is "Early Exit" or partial day permit
      // We mark session as finished (checkOut) and update status
      const attendance = await storage.updateAttendance(existing.id, {
        status: type,
        notes: notes,
        checkOut: now,
        checkOutPhoto: photoFileId,
        permitExitAt: now, // Record when the permit started mid-day
      });
      return res.json(attendance);
    }

    const attendance = await storage.createAttendance({
      userId,
      date: today,
      status: type, // 'sick' or 'permission'
      notes: notes,
      checkInPhoto: photoFileId,
      checkIn: now, // Technically they "started" their day with a permit
    });

    res.json(attendance);
  });

  app.post(api.attendance.resume.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const today = getJakartaDate();
    const userId = req.user!.id;

    // Get all sessions for today to determine next session number
    const existingSessions = await storage.getAttendanceSessionsByUserAndDate(userId, today);

    if (existingSessions.length === 0) {
      return res.status(400).json({ message: "No attendance record found for today" });
    }

    // Check if there's an active (not checked out) session
    const activeSession = existingSessions.find(s => !s.checkOut);
    if (activeSession) {
      return res.status(400).json({ message: "Masih ada sesi aktif. Silakan pulang dulu sebelum lanjut kerja." });
    }

    // Create new session with incremented session number
    // Create new session with incremented session number
    const nextSessionNumber = existingSessions.length + 1;
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const hour = jakartaTime.getHours();

    let status = "present";
    let isOvertime = false;
    let notes = `Sesi ke-${nextSessionNumber}`;

    // Overtime Logic for Resume
    const dayOfWeek = jakartaTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Indonesian Public Holidays 2026 (simplified)
    const holidaysString = [
      "2026-01-01", "2026-01-29", "2026-02-16", "2026-03-20",
      "2026-04-03", "2026-04-05", "2026-04-30", "2026-05-01",
      "2026-05-21", "2026-05-22", "2026-06-01", "2026-06-06",
      "2026-07-06", "2026-08-17", "2026-09-14", "2026-12-25",
    ];
    const isHoliday = holidaysString.includes(today);

    if (hour >= 17 || isWeekend || isHoliday) {
      status = "overtime";
      isOvertime = true;
      notes = `Overtime (Sesi ${nextSessionNumber})`;
    }

    // Create new attendance session
    const newSession = await storage.createAttendance({
      userId,
      date: today,
      checkIn: now,
      status: status,
      shift: 'Management',
      sessionNumber: nextSessionNumber,
      isOvertime: isOvertime,
      notes: notes
    });

    res.json(newSession);
  });

  app.get(api.attendance.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Admin can see all, Employee sees only theirs
    const userId = req.user!.role === 'admin' ? (req.query.userId ? Number(req.query.userId) : undefined) : req.user!.id;
    const month = req.query.month as string | undefined;

    const records = await storage.getAttendanceHistory(userId, month);
    res.json(records);
  });

  app.get(api.attendance.today.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const today = getJakartaDate();
    const sessions = await storage.getAttendanceSessionsByUserAndDate(req.user!.id, today);

    // 6 AM Reset Logic: Auto-close yesterday's open sessions
    if (sessions.length === 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const yesterdaySessions = await storage.getAttendanceSessionsByUserAndDate(req.user!.id, yesterdayStr);
      const openSession = yesterdaySessions.find(s => !s.checkOut);

      if (openSession) {
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        if (jakartaTime.getHours() >= 6) {
          // Auto-close yesterday's session at 6 AM
          await storage.updateAttendance(openSession.id, {
            checkOut: new Date(jakartaTime.setHours(6, 0, 0, 0)),
            notes: openSession.notes ? `${openSession.notes} (Auto-closed at 06:00)` : "Auto-closed at 06:00"
          });
          console.log(`[AutoReset] Closed session ${openSession.sessionNumber} for user ${req.user!.id} from ${yesterdayStr}`);
        }
      }
    }

    // Return active session (not checked out) or latest session
    const activeSession = sessions.find(s => !s.checkOut);
    const record = activeSession || sessions[sessions.length - 1];

    res.json(record || null);
  });

  // --- Admin Routes ---

  app.get(api.admin.users.list.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'admin') return res.sendStatus(401);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post(api.admin.users.create.path, upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated() || (req.user as DbUser).role !== 'admin') return res.sendStatus(401);

    try {
      const userData = { ...req.body };

      // Clean up empty strings to null for unique/optional fields
      if (userData.email === "") userData.email = null;
      if (userData.nik === "") userData.nik = null;
      if (userData.username === "") userData.username = null;
      if (userData.phoneNumber === "") userData.phoneNumber = null;

      // For employee, ensure username matches NIK if not provided
      if (userData.role === 'employee' && !userData.username && userData.nik) {
        userData.username = userData.nik;
      }

      // If still no username, return error as it's required for login
      if (!userData.username) {
        return res.status(400).json({ message: "Username atau NIK wajib diisi" });
      }

      // Hash the password before storing
      const hashedPassword = await hashPassword(userData.password || "password123");

      // Create user
      const user = await storage.createUser({ ...userData, password: hashedPassword });

      // If photo is uploaded, save it locally and update user
      if (req.file) {
        const filename = `emp-${user.id}-${Date.now()}-${req.file.originalname}`;
        const empUploadsDir = path.join(uploadsDir, 'employees');
        if (!fs.existsSync(empUploadsDir)) fs.mkdirSync(empUploadsDir);

        const filepath = path.join(empUploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);

        await storage.updateUser(user.id, { photoUrl: `/uploads/employees/${filename}` });
        user.photoUrl = `/uploads/employees/${filename}`;
      }

      res.status(201).json(user);
    } catch (err: any) {
      console.error("Create User Error:", err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "NIK atau Username sudah digunakan" });
      }
      res.status(400).json({ message: "Gagal membuat karyawan: " + (err.message || "Internal error") });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'admin') return res.sendStatus(401);

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

      await storage.deleteUser(id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete User Error:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.patch("/api/admin/users/:id", upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'admin') return res.sendStatus(401);

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

      const updates = { ...req.body };

      // Clean up empty strings to null for unique/optional fields
      if (updates.email === "") updates.email = null;
      if (updates.nik === "") updates.nik = null;
      if (updates.username === "") updates.username = null;
      if (updates.phoneNumber === "") updates.phoneNumber = null;

      // If photo is uploaded, save it locally
      if (req.file) {
        const filename = `emp-${id}-${Date.now()}-${req.file.originalname}`;
        const empUploadsDir = path.join(uploadsDir, 'employees');
        if (!fs.existsSync(empUploadsDir)) fs.mkdirSync(empUploadsDir);

        const filepath = path.join(empUploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        updates.photoUrl = `/uploads/employees/${filename}`;
      }

      // If password provided, hash it
      if (updates.password && updates.password.length > 0) {
        updates.password = await hashPassword(updates.password);
      } else {
        delete updates.password; // Don't update password if empty
      }

      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (err: any) {
      console.error("Update User Error:", err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "NIK atau Username sudah digunakan" });
      }
      res.status(400).json({ message: "Gagal memperbarui karyawan" });
    }
  });

  app.get(api.admin.dashboard.stats.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'admin') return res.sendStatus(401);

    const users = await storage.getAllUsers();
    // Simple stats
    const totalEmployees = users.filter(u => u.role === 'employee').length;

    // Present today
    const today = new Date().toISOString().split('T')[0];
    const allAttendance = await storage.getAttendanceHistory(undefined, undefined); // This gets all history, might be heavy. 
    // Optimization: getAttendanceHistory filters by month, but here we want today.
    // I should add getAttendanceByDate to storage later or filter here.
    // Ideally storage.getAttendanceByDate(date).
    // For now, let's just filter in memory if dataset is small, or use what we have.
    const todayRecords = allAttendance.filter(a => a.date === today && a.status === 'present');

    res.json({
      totalEmployees,
      presentToday: todayRecords.length,
    });
  });

  // --- Announcement Routes ---

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  // Serve uploads statically
  app.use('/uploads', express.static(uploadsDir));

  app.get(api.announcements.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.getAnnouncements();
    // Filter expired on the fly or in DB query. Since DB query is simple select *, filter here.
    const now = new Date();
    const active = list.filter(a => !a.expiresAt || new Date(a.expiresAt).getTime() > now.getTime());
    res.json(active);
  });

  app.post(api.announcements.create.path, upload.single('image'), async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'admin') return res.sendStatus(401);

    try {
      // Parse body (multipart/form-data means numbers come as strings)
      // We manually construct input object because z.parse might fail specific format
      // But let's try to match what schema expects

      let imageUrl = undefined;
      const multerReq = req as any;
      if (multerReq.file) {
        const filename = `${Date.now()}-${multerReq.file.originalname}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, multerReq.file.buffer);
        imageUrl = `/uploads/${filename}`;
      }

      const inputData = {
        title: req.body.title,
        content: req.body.content,
        imageUrl: imageUrl,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined, // Handle empty string
      };

      const announcement = await storage.createAnnouncement({
        ...inputData,
        authorId: req.user!.id,
      });
      res.status(201).json(announcement);
    } catch (e) {
      console.error("Announcement Create Error:", e);
      res.status(400).json({ message: "Invalid input or server error" });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'admin') return res.sendStatus(401);

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteAnnouncement(id);
      res.sendStatus(204);
    } catch (e) {
      console.error(e);
      res.sendStatus(500);
    }
  });

  // --- Shift Swap Routes ---

  app.post("/api/shift-swaps", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { targetUserId, date, targetDate, reason } = req.body;
      if (!date || !targetDate || !reason || !targetUserId) {
        return res.status(400).json({ message: "Lengkapi data pengajuan tukar piket" });
      }

      const swap = await storage.createShiftSwap({
        requesterId: req.user!.id,
        targetUserId: parseInt(targetUserId),
        date: date, // YYYY-MM-DD
        targetDate: targetDate, // YYYY-MM-DD
        reason: reason,
      });
      res.status(201).json(swap);
    } catch (e) {
      console.error("Shift Swap Create Error:", e);
      res.status(500).json({ message: "Gagal membuat pengajuan tukar piket" });
    }
  });

  app.get("/api/shift-swaps", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // If admin, maybe see all? For now, let's just see mine (requested or received)
      // Or if admin, see all.
      const userId = req.user!.role === 'admin' ? undefined : req.user!.id;
      const swaps = await storage.getShiftSwaps(userId);
      res.json(swaps);
    } catch (e) {
      console.error("Shift Swap List Error:", e);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.patch("/api/shift-swaps/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const id = parseInt(req.params.id);
      const { status } = req.body; // 'approved' | 'rejected'

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const swap = await storage.getShiftSwapById(id);
      if (!swap) return res.sendStatus(404);

      // Only Admin or Target User can approve/reject
      if (req.user!.role !== 'admin' && req.user!.id !== swap.targetUserId) {
        return res.status(403).json({ message: "Not authorized to update this request" });
      }

      const updated = await storage.updateShiftSwapStatus(id, status);
      res.json(updated);
    } catch (e) {
      console.error("Shift Swap Update Error:", e);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  // --- Piket Schedule Routes ---

  app.get("/api/admin/piket-schedules", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'admin') return res.sendStatus(401);
    try {
      const month = req.query.month as string | undefined;
      const list = await storage.getPiketSchedules(month);
      res.json(list);
    } catch (e) {
      console.error("[API] get /api/admin/piket-schedules error:", e);
      res.status(500).json({ message: "Gagal mengambil jadwal piket" });
    }
  });

  app.post("/api/admin/piket-schedules", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'admin') return res.sendStatus(401);
    try {
      const { userId, date, notes } = req.body;
      console.log(`[API] Saving piket: userId=${userId}, date=${date}`);
      const schedule = await storage.createOrUpdatePiketSchedule({
        userId: parseInt(userId),
        date,
        notes
      });
      res.status(201).json(schedule);
    } catch (e) {
      console.error("[API] post /api/admin/piket-schedules error:", e);
      res.status(500).json({ message: "Failed to save schedule", details: (e as Error).message });
    }
  });

  app.get("/api/piket-schedules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const month = req.query.month as string | undefined;
      const list = await storage.getPiketSchedules(month);
      res.json(list);
    } catch (e) {
      console.error("[API] get /api/piket-schedules error:", e);
      res.status(500).json({ message: "Gagal mengambil jadwal piket" });
    }
  });

  return httpServer;
}
