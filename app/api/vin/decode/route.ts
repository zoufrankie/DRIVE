import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api";

// Map raw NHTSA "Variable" names to our internal field names
const FIELD_MAP: Record<string, string> = {
  "Make": "make",
  "Model": "model",
  "Model Year": "year",
  "Trim": "trim",
  "Body Class": "vehicleType",
  "Transmission Style": "transmission",
  "Drive Type": "drivenWheels",
  "Series": "series",
};

// Normalize NHTSA's verbose drive type strings into our short codes
function normalizeDriveType(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.toUpperCase();
  if (v.includes("FWD") || v.includes("FRONT-WHEEL") || v.includes("FRONT WHEEL")) return "FWD";
  if (v.includes("RWD") || v.includes("REAR-WHEEL") || v.includes("REAR WHEEL")) return "RWD";
  if (v.includes("AWD") || v.includes("ALL-WHEEL") || v.includes("ALL WHEEL")) return "AWD";
  if (v.includes("4WD") || v.includes("4-WHEEL") || v.includes("FOUR-WHEEL") || v.includes("4 WHEEL")) return "4WD";
  if (v.includes("4X2") || v.includes("4X4")) return v.includes("4X4") ? "4WD" : "RWD";
  return null;
}

// Round displacement to 1 decimal (2.998832712 -> "3.0")
function formatDisplacement(raw: string | undefined): string | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return raw;
  return n.toFixed(1);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const vin = String(body.vin ?? "").trim().toUpperCase();

  if (vin.length !== 17) {
    return NextResponse.json(
      { error: "VIN must be exactly 17 characters." },
      { status: 400 }
    );
  }

  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return NextResponse.json(
      { error: "VIN contains invalid characters. Valid: A-Z (excluding I, O, Q) and 0-9." },
      { status: 400 }
    );
  }

  const existing = await prisma.vehicle.findUnique({ where: { vin } });
  if (existing?.vinDecoded && existing.vinDecodedAt) {
    const ageMs = Date.now() - existing.vinDecodedAt.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (ageMs < thirtyDays) {
      try {
        const cached = JSON.parse(existing.vinDecoded);
        return NextResponse.json({ ...cached, cached: true });
      } catch {
        // Corrupt cache — fall through
      }
    }
  }

  try {
    const url = `${NHTSA_BASE}/vehicles/decodevin/${vin}?format=json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`NHTSA returned ${res.status}`);
    const data = await res.json();

    // Build a flat map of { Variable -> Value }, skipping empty values
    const raw: Record<string, string> = {};
    for (const item of data.Results ?? []) {
      const v = item.Value;
      if (v && v !== "Not Applicable" && v !== "0" && v !== "null") {
        raw[item.Variable] = String(v);
      }
    }

    // Map to our field names
    const mapped: Record<string, unknown> = {};
    for (const [nhtsaKey, ourKey] of Object.entries(FIELD_MAP)) {
      if (raw[nhtsaKey]) mapped[ourKey] = raw[nhtsaKey];
    }

    // Normalize drive type: "Front-Wheel Drive (FWD)" -> "FWD"
    const drive = normalizeDriveType(raw["Drive Type"]);
    if (drive) mapped.drivenWheels = drive;
    else delete mapped.drivenWheels;

    // Build a clean engine string: "3.0L 6-cyl J30A4"
    const engineParts: string[] = [];
    const disp = formatDisplacement(raw["Displacement (L)"]);
    if (disp) engineParts.push(`${disp}L`);
    if (raw["Engine Number of Cylinders"])
      engineParts.push(`${raw["Engine Number of Cylinders"]}-cyl`);
    if (raw["Engine Model"]) engineParts.push(raw["Engine Model"]);
    if (engineParts.length) mapped.engine = engineParts.join(" ");
    else delete mapped.engine;

    // Year to number
    if (mapped.year) {
      const y = Number(mapped.year);
      if (Number.isFinite(y)) mapped.year = y;
    }

    // Transmission: keep only if we recognize it, else leave blank for manual entry
    const tx = (raw["Transmission Style"] ?? "").toLowerCase();
    if (tx.includes("manual")) mapped.transmission = "Manual";
    else if (tx.includes("cvt") || tx.includes("continuously variable")) mapped.transmission = "CVT";
    else if (tx.includes("dual")) mapped.transmission = "Dual-Clutch";
    else if (tx.includes("automatic")) mapped.transmission = "Automatic";
    else delete mapped.transmission;

    const response = {
      vin,
      decoded: mapped,
      raw,
      source: "NHTSA vPIC",
      cached: false,
    };

    if (existing) {
      await prisma.vehicle.update({
        where: { id: existing.id },
        data: {
          vinDecoded: JSON.stringify(response),
          vinDecodedAt: new Date(),
        },
      });
    }

    return NextResponse.json(response);
  } catch (e) {
    console.error("VIN decode failed:", e);
    return NextResponse.json(
      { error: "Could not reach the VIN database. Try again in a moment." },
      { status: 502 }
    );
  }
}