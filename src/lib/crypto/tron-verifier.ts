import dns from 'node:dns/promises';
import net from 'node:net';

export interface TronVerificationResult {
  verified: boolean;
  blockNumber?: number;
  senderAddress?: string;
  recipientAddress?: string;
  tokenSymbol?: string;
  actualAmountUsdt?: number;
  confirmed?: boolean;
  message?: string;
  raw?: unknown;
}

export interface Trc20Transfer {
  contract_address?: string;
  symbol?: string;
  to_address?: string;
  from_address?: string;
  amount_str?: string;
  decimals?: number;
}

// Official TRC-20 USDT smart contract on Tron mainnet
export const TRON_USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// Default benchmark rate: 1 USDT = 900,000 IRR (90,000 Tomans)
export const DEFAULT_USDT_TO_IRR_RATE = 900000;

export function isValidTronAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(address.trim());
}

export function isValidTxHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') return false;
  return /^[a-fA-F0-9]{64}$/.test(hash.trim());
}

/**
 * Validates host against SSRF: ensures only public IPs or local VPN fake-IPs (198.18.0.0/15)
 */
async function isHostAllowed(hostname: string): Promise<boolean> {
  const allowedHosts = new Set([
    'apilist.tronscanapi.com',
    'apilist.tronscan.org',
    'api.trongrid.io',
  ]);

  if (!allowedHosts.has(hostname.toLowerCase())) {
    return false;
  }

  try {
    const lookup = await dns.lookup(hostname, { all: true });
    for (const record of lookup) {
      const ip = record.address;
      if (net.isIPv4(ip)) {
        const parts = ip.split('.').map(Number);
        // Loopback 127.x
        if (parts[0] === 127) return false;
        // Private: 10.x, 192.168.x, 172.16.x - 172.31.x
        if (parts[0] === 10) return false;
        if (parts[0] === 192 && parts[1] === 168) return false;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
        // 0.0.0.0 / 169.254.x
        if (parts[0] === 0 || (parts[0] === 169 && parts[1] === 254)) return false;
        // 198.18.0.0/15 is allowed for this machine's VPN proxy
      } else if (net.isIPv6(ip)) {
        if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
          return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies a TRC-20 USDT transaction on TronScan public API
 */
export async function verifyTronTransactionOnChain(
  txHash: string,
  expectedDestination: string,
  expectedAmountUsdt: number
): Promise<TronVerificationResult> {
  const cleanHash = txHash.trim();
  if (!isValidTxHash(cleanHash)) {
    return { verified: false, message: 'فرمت کد هش تراکنش (TxID) نامعتبر است. باید ۶۴ کاراکتر هگزادسیمال باشد.' };
  }

  const hostname = 'apilist.tronscanapi.com';
  const allowed = await isHostAllowed(hostname);
  if (!allowed) {
    return { verified: false, message: 'عدم امکان اتصال به شبکه ترون به دلیل محدودیت امنیتی میزبان' };
  }

  try {
    const url = `https://${hostname}/api/transaction-info?hash=${cleanHash}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FiruzoPlatform/2.0 (Travel & Crypto Settlement)',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { verified: false, message: `پاسخ ناموفق از ترون‌اسکن: HTTP ${response.status}` };
    }

    const data = await response.json();

    // TronScan transaction data analysis
    const contractRet = data.contractRet;
    const isSuccess = contractRet === 'SUCCESS' || data.confirmed === true;

    if (!isSuccess) {
      return {
        verified: false,
        confirmed: false,
        message: 'تراکنش در شبکه ترون هنوز نهایی نشده یا ناموفق (REVERTED) بوده است.',
        raw: data,
      };
    }

    // Inspect TRC-20 transfer
    const trc20Info = data.trc20TransferInfo;
    if (!Array.isArray(trc20Info) || trc20Info.length === 0) {
      return {
        verified: false,
        confirmed: true,
        message: 'این تراکنش شامل انتقال توکن TRC-20 تتر نمی‌باشد.',
        raw: data,
      };
    }

    // Find transfer matching our expected destination or USDT contract
    const transfer = trc20Info.find((t: Trc20Transfer) => {
      const isUsdt = t.contract_address === TRON_USDT_CONTRACT_ADDRESS || t.symbol === 'USDT';
      const destMatches = expectedDestination
        ? t.to_address?.toLowerCase() === expectedDestination.toLowerCase()
        : true;
      return isUsdt && destMatches;
    }) || trc20Info[0];

    const actualAmount = parseFloat(transfer.amount_str || '0') / Math.pow(10, transfer.decimals || 6);
    const recipient = transfer.to_address;
    const sender = transfer.from_address;

    // Check amount tolerance (e.g. difference <= 0.05 USDT to handle small rounding)
    const amountMatches = expectedAmountUsdt > 0
      ? Math.abs(actualAmount - expectedAmountUsdt) <= 0.1 || actualAmount >= expectedAmountUsdt
      : true;

    const destMatches = expectedDestination
      ? recipient?.toLowerCase() === expectedDestination.toLowerCase()
      : true;

    if (!destMatches) {
      return {
        verified: false,
        confirmed: true,
        senderAddress: sender,
        recipientAddress: recipient,
        actualAmountUsdt: actualAmount,
        tokenSymbol: transfer.symbol,
        message: `آدرس مقصد تراکنش (${recipient}) با کیف پول رسمی فیروزو مطابقت ندارد.`,
        raw: data,
      };
    }

    if (!amountMatches) {
      return {
        verified: false,
        confirmed: true,
        senderAddress: sender,
        recipientAddress: recipient,
        actualAmountUsdt: actualAmount,
        tokenSymbol: transfer.symbol,
        message: `مبلغ واریز شده (${actualAmount} USDT) با مبلغ سفارش (${expectedAmountUsdt} USDT) مغایرت دارد.`,
        raw: data,
      };
    }

    return {
      verified: true,
      confirmed: true,
      blockNumber: data.block,
      senderAddress: sender,
      recipientAddress: recipient,
      tokenSymbol: transfer.symbol || 'USDT',
      actualAmountUsdt: actualAmount,
      message: 'تراکنش با موفقیت در شبکه ترون تأیید شد.',
      raw: {
        hash: cleanHash,
        block: data.block,
        timestamp: data.timestamp,
        from: sender,
        to: recipient,
        amount: actualAmount,
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'خطای شبکه';
    return {
      verified: false,
      message: `استعلام برخط ترون در دسترس نیست: ${errorMsg}. فیش توسط مدیر مالی بررسی می‌شود.`,
    };
  }
}
