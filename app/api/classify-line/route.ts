import { NextResponse } from "next/server";
import { auth } from "@/auth";

const CLASSIFIER_URL = process.env.CLASSIFIER_URL ?? "http://localhost:8001";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const text = String(body.description ?? "").trim();
  if (!text) return NextResponse.json({ category: null, confidence: 0 });

  try {
    const res = await fetch(`${CLASSIFIER_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ category: null, confidence: 0 });
    const data = await res.json();
    return NextResponse.json({
      category: data.category ?? null,
      confidence: data.confidence ?? 0,
    });
  } catch {
    return NextResponse.json({ category: null, confidence: 0 });
  }
}