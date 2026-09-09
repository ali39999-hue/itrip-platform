import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface WeChatTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WeChatUserInfoResponse {
  openid?: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * Validates outgoing WeChat API URLs against SSRF:
 * 1. Enforces HTTPS only
 * 2. Whitelists official WeChat API hostnames
 * 3. Prohibits localhost, loopback, private and reserved networks
 */
function assertSafeWeChatUrl(urlStr: string): URL {
  const parsed = new URL(urlStr);
  if (parsed.protocol !== 'https:') {
    throw new Error('Security violation: Only HTTPS protocol is allowed for external requests');
  }

  const allowedHosts = new Set(['api.weixin.qq.com']);
  if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error(`Security violation: Destination host ${parsed.hostname} is not permitted`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isForbidden =
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname === '::1';

  if (isForbidden) {
    throw new Error('Security violation: Access to private or loopback addresses is forbidden');
  }

  return parsed;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !/^[a-zA-Z0-9_-]+$/.test(code)) {
    return NextResponse.json({ error: 'Valid authorization code is required' }, { status: 400 });
  }

  const appId = process.env.WECHAT_APP_ID || process.env.NEXT_PUBLIC_WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('[WeChatOAuth] Missing WECHAT_APP_ID or WECHAT_APP_SECRET');
    return NextResponse.json(
      { error: 'WeChat OAuth is not configured on the server (WECHAT_APP_ID / WECHAT_APP_SECRET missing)' },
      { status: 500 }
    );
  }

  try {
    // 1. Build and validate token exchange URL
    const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
    tokenUrl.searchParams.set('appid', appId);
    tokenUrl.searchParams.set('secret', appSecret);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('grant_type', 'authorization_code');

    const safeTokenUrl = assertSafeWeChatUrl(tokenUrl.toString());
    const tokenRes = await fetch(safeTokenUrl, { method: 'GET', cache: 'no-store' });
    const tokenData = (await tokenRes.json()) as WeChatTokenResponse;

    if (tokenData.errcode || !tokenData.access_token || !tokenData.openid) {
      console.error('[WeChatOAuth] Token exchange error:', tokenData);
      return NextResponse.json(
        { error: `WeChat token exchange failed: ${tokenData.errmsg || 'Unknown WeChat error'}` },
        { status: 400 }
      );
    }

    // 2. Build and validate userinfo URL
    const userInfoUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
    userInfoUrl.searchParams.set('access_token', tokenData.access_token);
    userInfoUrl.searchParams.set('openid', tokenData.openid);
    userInfoUrl.searchParams.set('lang', 'zh_CN');

    const safeUserInfoUrl = assertSafeWeChatUrl(userInfoUrl.toString());
    const userRes = await fetch(safeUserInfoUrl, { method: 'GET', cache: 'no-store' });
    const userData = (await userRes.json()) as WeChatUserInfoResponse;

    const wechatIdentifier = userData.unionid || tokenData.unionid || tokenData.openid;
    const nickname = userData.nickname || 'WeChat User';
    const avatar = userData.headimgurl;

    // 3. Upsert user in database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { wechatId: wechatIdentifier },
          { wechatId: tokenData.openid },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          wechatId: wechatIdentifier,
          name: nickname,
          avatar: avatar,
          role: 'CUSTOMER',
          isActive: true,
        },
      });

      const role = await prisma.role.upsert({
        where: { name: 'CUSTOMER' },
        update: {},
        create: {
          name: 'CUSTOMER',
          description: 'Customer Role',
        },
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    // 4. Safe redirect back to application
    let targetPath = '/account';
    if (state && state.startsWith('/') && !state.startsWith('//')) {
      targetPath = state;
    }

    const redirectUrl = new URL(targetPath, req.url);
    redirectUrl.searchParams.set('auth_channel', 'wechat');
    redirectUrl.searchParams.set('auth_success', '1');

    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[WeChatOAuth] Exception during OAuth callback:', errorMsg);
    return NextResponse.json({ error: 'Internal error processing WeChat login', details: errorMsg }, { status: 500 });
  }
}
