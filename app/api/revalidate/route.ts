import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Wenn du Tags nutzt: await revalidateTag('creators');
    // Bei App Router ohne Tags reicht meist das sidewide revalidate via fetch(next: { revalidate })
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
