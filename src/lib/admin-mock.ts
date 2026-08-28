export type ActionTask = {
  id: string;
  type: 'ticket' | 'refund' | 'visa' | 'review';
  title: string;
  subtitle: string;
  urgency: 'high' | 'medium' | 'low';
  timeAgo: string;
};

export const PENDING_TASKS: ActionTask[] = [
  { id: 't1', type: 'ticket', title: 'تغییر تاریخ پرواز استانبول', subtitle: 'شماره رزرو: FLY-8821', urgency: 'high', timeAgo: '۱۰ دقیقه پیش' },
  { id: 't2', type: 'refund', title: 'استرداد وجه رزرو هتل دبی', subtitle: 'مبلغ: ۱۲,۵۰۰,۰۰۰ تومان', urgency: 'high', timeAgo: '۱ ساعت پیش' },
  { id: 't3', type: 'visa', title: 'بررسی مدارک ویزای شینگن', subtitle: 'مسافر: علی احمدی', urgency: 'medium', timeAgo: '۳ ساعت پیش' },
  { id: 't4', type: 'ticket', title: 'درخواست ویلچر فرودگاه', subtitle: 'شماره رزرو: FLY-9012', urgency: 'medium', timeAgo: '۵ ساعت پیش' },
  { id: 't5', type: 'review', title: 'تایید کامنت هتل پارسیان', subtitle: 'کاربر: مریم گ.', urgency: 'low', timeAgo: '۱ روز پیش' },
];

export type LiveEvent = {
  id: string;
  type: 'booking' | 'payment' | 'login' | 'alert';
  title: string;
  user: string;
  time: string;
};

export const LIVE_FEED: LiveEvent[] = [
  { id: 'e1', type: 'booking', title: 'ثبت رزرو تور پاریس', user: 'رضا کریمی', time: 'همین الان' },
  { id: 'e2', type: 'payment', title: 'پرداخت موفق ۳۵,۰۰۰,۰۰۰ تومان', user: 'سارا نوری', time: '۲ دقیقه پیش' },
  { id: 'e3', type: 'alert', title: 'ظرفیت پرواز کیش رو به اتمام (۳ صندلی)', user: 'سیستم', time: '۱۵ دقیقه پیش' },
  { id: 'e4', type: 'login', title: 'ورود ناموفق به حساب (۳ بار)', user: '0912***4567', time: '۳۰ دقیقه پیش' },
  { id: 'e5', type: 'booking', title: 'رزرو هتل اسپیناس', user: 'محمد جوادی', time: '۱ ساعت پیش' },
];
