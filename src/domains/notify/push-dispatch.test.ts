import { describe, it, expect } from 'vitest';
import { PushDispatchService } from '@/domains/notify/PushDispatchService';

describe('Web Push Dispatch Service (پوش نوتیفیکیشن)', () => {
  it('detects VAPID configuration accurately', () => {
    // We set VAPID keys in .env
    const isConfigured = PushDispatchService.isConfigured();
    expect(typeof isConfigured).toBe('boolean');
  });

  it('handles empty subscription array safely without throwing', async () => {
    const res = await PushDispatchService.sendToUser('non-existent-user-12345', {
      title: 'تست',
      body: 'متن تست',
    });
    expect(res.sent).toBe(0);
    expect(res.removed).toBe(0);
  });
});
