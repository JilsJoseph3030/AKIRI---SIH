import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { loginType, payload } = body;

    // 1. Pseudonymous Collector QR Login (No PAN/GST required)
    if (loginType === 'QR_ALIAS') {
      const aliasCode = payload.aliasCode;
      
      // Strict regex matching for L1 Pseudonym pattern
      if (!aliasCode || typeof aliasCode !== 'string' || !aliasCode.match(/^L1-ALIAS-[A-Z0-9]{4}$/)) {
        return NextResponse.json({ error: 'Invalid QR Alias format' }, { status: 400 });
      }

      // In production: const { data } = await supabase.from('collector_aliases').select('*').eq('alias_code', aliasCode).single();
      
      const mockSession = {
        userId: crypto.randomUUID(),
        role: 'INDEPENDENT_KABADIWALA',
        token: `mock_jwt_${Date.now()}`,
        aliasCode: aliasCode,
        lastLogin: new Date().toISOString()
      };

      return NextResponse.json({ success: true, session: mockSession }, { status: 200 });
    }

    // 2. Recycler/Hub Auth (Phone + OTP Verification)
    if (loginType === 'PHONE_OTP') {
      const { phone, otp } = payload;
      
      if (!phone || !otp) {
        return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });
      }

      // In production: const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
      // if (error) return NextResponse.json({ error: error.message }, { status: 401 });
      
      // RBAC: Determine role based on mock phone lookup (Ends with 99 -> Recycler)
      const role = phone.endsWith('99') ? 'AUTHORIZED_RECYCLER' : 'AGGREGATOR_HUB';

      const mockSession = {
        userId: crypto.randomUUID(),
        role: role,
        token: `mock_jwt_${Date.now()}`,
        lastLogin: new Date().toISOString()
      };

      return NextResponse.json({ success: true, session: mockSession }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid loginType' }, { status: 400 });
  } catch (error: any) {
    console.error("Auth Login Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
