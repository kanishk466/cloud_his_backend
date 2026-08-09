# ─── CREATE DOCTOR PROFILE ────────────────────────────────────────
POST /api/opd/doctors
{
  "hospitalUserId": "user-uuid",
  "specialization": "General Medicine",
  "qualifications": "MBBS, MD (Internal Medicine)",
  "consultationFee": 500,
  "slotDurationMins": 10,
  "bufferTimeMins": 0,
  "maxPatientsPerDay": 40,
  "isActive": true
}

# ─── SET WEEKLY AVAILABILITY (Your UI) ────────────────────────────
POST /api/opd/doctors/{doctorId}/availability
{
  "slotDurationMins": 10,
  "schedule": [
    { "dayOfWeek": 0, "isActive": false },
    { "dayOfWeek": 1, "isActive": true, "startTime": "09:00", "endTime": "17:00", "breakStartTime": "13:00", "breakEndTime": "14:00" },
    { "dayOfWeek": 2, "isActive": true, "startTime": "09:00", "endTime": "17:00", "breakStartTime": "13:00", "breakEndTime": "14:00" },
    { "dayOfWeek": 3, "isActive": true, "startTime": "09:00", "endTime": "17:00", "breakStartTime": "13:00", "breakEndTime": "14:00" },
    { "dayOfWeek": 4, "isActive": true, "startTime": "09:00", "endTime": "17:00", "breakStartTime": "13:00", "breakEndTime": "14:00" },
    { "dayOfWeek": 5, "isActive": true, "startTime": "09:00", "endTime": "17:00", "breakStartTime": "13:00", "breakEndTime": "14:00" },
    { "dayOfWeek": 6, "isActive": true, "startTime": "09:00", "endTime": "17:00", "breakStartTime": "13:00", "breakEndTime": "14:00" }
  ]
}

# ─── RESPONSE ─────────────────────────────────────────────────────
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Dr. Priya Sharma",
    "specialization": "General Medicine",
    "consultationFee": 500,
    "slotDurationMins": 10,
    "availability": [
      { "dayOfWeek": 1, "dayName": "Monday", "isActive": true, "startTime": "09:00", "endTime": "17:00", "breakStartTime": "13:00", "breakEndTime": "14:00", "workingHours": 7.0 },
      { "dayOfWeek": 2, "dayName": "Tuesday", "isActive": true, "startTime": "09:00", "endTime": "17:00", "workingHours": 7.0 }
    ]
  }
}

# ─── CREATE LEAVE ─────────────────────────────────────────────────
POST /api/opd/doctors/{doctorId}/leaves
{
  "blockDate": "2025-06-20",
  "reason": "Personal leave"
}

# ─── PARTIAL DAY LEAVE ────────────────────────────────────────────
POST /api/opd/doctors/{doctorId}/leaves
{
  "blockDate": "2025-06-15",
  "startTime": "14:00",
  "endTime": "17:00",
  "reason": "Attending medical conference"
}

# ─── LIST LEAVES ──────────────────────────────────────────────────
GET /api/opd/doctors/{doctorId}/leaves?fromDate=2025-06-01&toDate=2025-06-30

# ─── GET AVAILABILITY ─────────────────────────────────────────────
GET /api/opd/doctors/{doctorId}/availability

# ─── GET AVAILABLE SLOTS (Now break-aware) ────────────────────────
GET /api/opd/appointments/slots?doctorProfileId={id}&date=2025-06-10

# Response now excludes 13:00-14:00 break slots automatically
{
  "data": {
    "slots": [
      { "startTime": "09:00", "endTime": "09:10", "isAvailable": true },
      { "startTime": "09:10", "endTime": "09:20", "isAvailable": true },
      // ... slots until 12:50-13:00 ...
      // 13:00 - 14:00 slots SKIPPED (break time)
      { "startTime": "14:00", "endTime": "14:10", "isAvailable": true },
      // ... slots until 16:50-17:00 ...
    ]
  }
}