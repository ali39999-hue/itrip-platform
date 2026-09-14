'use client';

import React, { useState, useEffect } from 'react';
import { Star, MessageSquarePlus, CheckCircle2, User, ThumbsUp, Sparkles } from 'lucide-react';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';

export interface AdventureReviewItem {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  travelType?: string;
  helpfulCount?: number;
  verified?: boolean;
}

interface AdventureReviewsSectionProps {
  experienceTitle: string;
  locale: string;
}

const DEFAULT_REVIEWS: Record<string, AdventureReviewItem[]> = {
  default: [
    {
      id: 'rev-adv-1',
      author: 'سارا کاظمی',
      rating: 5,
      date: '۱۴۰۳/۰۶/۲۰',
      comment: 'این ماجراجویی واقعاً یکی از فراموش‌نشدنی‌ترین خاطرات من بود. راهنما بسیار حرفه‌ای و خوش‌برخورد بود.',
      travelType: 'خانوادگی',
      helpfulCount: 14,
      verified: true,
    },
    {
      id: 'rev-adv-2',
      author: 'امیرحسین رضوی',
      rating: 5,
      date: '۱۴۰۳/۰۵/۱۱',
      comment: 'همه‌چیز سر وقت انجام شد و عکاسی در این لوکیشن فوق‌العاده بود. حتماً به دوستانم پیشنهاد می‌کنم.',
      travelType: 'دوستانه',
      helpfulCount: 9,
      verified: true,
    },
    {
      id: 'rev-adv-3',
      author: 'الهام مقدسی',
      rating: 4,
      date: '۱۴۰۳/۰۴/۱۸',
      comment: 'برنامه‌ریزی عالی و تجربه منحصربه‌فرد، فقط بهتر است کفش ورزشی راحت همراه داشته باشید.',
      travelType: 'انفرادی',
      helpfulCount: 6,
      verified: true,
    },
  ],
};

export function AdventureReviewsSection({
  experienceTitle,
  locale,
}: AdventureReviewsSectionProps) {
  const storageKey = `adventure_reviews_${experienceTitle}`;

  const [reviews, setReviews] = useState<AdventureReviewItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [travelType, setTravelType] = useState('خانوادگی');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Load reviews on mount or title change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReviews(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setReviews(DEFAULT_REVIEWS.default);
  }, [storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newRev: AdventureReviewItem = {
      id: `rev-usr-${Date.now()}`,
      author: author.trim() || lt(locale, { fa: 'مسافر فیروزو', en: 'Firuzo Traveler', ar: 'مسافر فيروزو', zh: 'Firuzo 旅客', ru: 'Путешественник Firuzo' }),
      rating,
      date: 'امروز',
      comment: comment.trim(),
      travelType,
      helpfulCount: 1,
      verified: true,
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }

    setAuthor('');
    setComment('');
    setShowForm(false);
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <div className="rounded-2xl border border-line bg-soft/40 p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center text-amber-500">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                className="fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="font-mono font-black text-sm text-ink">{num(Number(avgRating), locale)}</span>
          <span className="text-xs text-sub font-bold">
            ({num(reviews.length, locale)}{' '}
            {lt(locale, {
              fa: 'نظر ثبت‌شده مسافران',
              en: 'traveler reviews',
              ar: 'تقييم مسافرين',
              zh: '条旅客评价',
              ru: 'отзывов',
            })})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="min-h-9 px-3 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand-dark font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <MessageSquarePlus size={14} />
          <span>
            {showForm
              ? lt(locale, { fa: 'بستن فرم نظر', en: 'Close Form', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })
              : lt(locale, { fa: 'ثبت نظر و امتیاز شما', en: 'Write a Review', ar: 'أضف تقييمك', zh: '写评价', ru: 'Оставить отзыв' })}
          </span>
        </button>
      </div>

      {/* Success banner */}
      {submittedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center gap-2 border border-emerald-300 animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>
            {lt(locale, {
              fa: 'نظر و امتیاز شما برای این ماجراجویی با موفقیت ثبت شد و به نمایش درآمد.',
              en: 'Your review and rating for this adventure have been published.',
              ar: 'تم نشر تقييمك لهذه المغامرة بنجاح.',
              zh: '您的探险体验评价已成功发布。',
              ru: 'Ваш отзыв об этом приключении успешно опубликован.',
            })}
          </span>
        </div>
      )}

      {/* Review Submission Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-surface border border-line space-y-3">
          <h4 className="text-xs font-black text-ink m-0 flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-dark" />
            {lt(locale, { fa: 'تجربه و نظر خود درباره این ماجراجویی را بنویسید', en: 'Share your adventure experience', ar: 'شارك تجربتك في هذه المغامرة', zh: '分享您的探险体验', ru: 'Поделитесь впечатлениями' })}
          </h4>

          {/* Rating Star Selection */}
          <div>
            <span className="block text-[11px] font-bold text-sub mb-1">
              {lt(locale, { fa: 'امتیاز شما به این ماجراجویی:', en: 'Your Rating:', ar: 'تقييمك:', zh: '您的评分：', ru: 'Ваша оценка:' })}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-amber-400 hover:scale-110 transition cursor-pointer"
                  aria-label={`${star} ستاره`}
                >
                  <Star
                    size={20}
                    className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="adv-rev-author" className="block text-[11px] font-bold text-sub mb-1">
                {lt(locale, { fa: 'نام و نام خانوادگی:', en: 'Full Name:', ar: 'الاسم:', zh: '姓名：', ru: 'Имя:' })}
              </label>
              <input
                id="adv-rev-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={lt(locale, { fa: 'مثلاً: علی محمدی', en: 'e.g. John Doe', ar: 'مثال: علي محمد', zh: '例如：李明', ru: 'например: Иван' })}
                className="w-full h-9 px-3 rounded-lg bg-soft border border-line text-xs font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            <div>
              <label htmlFor="adv-rev-type" className="block text-[11px] font-bold text-sub mb-1">
                {lt(locale, { fa: 'نوع همسفر:', en: 'Travel Style:', ar: 'نوع السفر:', zh: '出行方式：', ru: 'Тип поездки:' })}
              </label>
              <select
                id="adv-rev-type"
                value={travelType}
                onChange={(e) => setTravelType(e.target.value)}
                className="w-full h-9 px-2 rounded-lg bg-soft border border-line text-xs font-bold text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="خانوادگی">خانوادگی</option>
                <option value="دوستانه">دوستانه</option>
                <option value="زوج">زوج / دونفره</option>
                <option value="انفرادی">انفرادی</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="adv-rev-comment" className="block text-[11px] font-bold text-sub mb-1">
              {lt(locale, { fa: 'متن نظر شما:', en: 'Your Review Comment:', ar: 'نص التقييم:', zh: '评价详情：', ru: 'Ваш отзыв:' })}
            </label>
            <textarea
              id="adv-rev-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              placeholder={lt(locale, {
                fa: 'نقاط قوت، زمان‌بندی، کیفیت راهنما و نکات ضروری این ماجراجویی را بنویسید...',
                en: 'Share highlights, guide quality, and tips for future travelers...',
                ar: 'اكتب انطباعاتك وملاحظاتك حول هذه المغامرة...',
                zh: '写下您对本次探险亮点、向导服务与出行贴士的真实评价...',
                ru: 'Опишите ваши впечатления, качество гида и полезные советы...',
              })}
              className="w-full p-2.5 rounded-lg bg-soft border border-line text-xs font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-9 px-4 rounded-lg bg-soft text-sub hover:text-ink text-xs font-bold cursor-pointer"
            >
              {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
            </button>
            <button
              type="submit"
              className="min-h-9 px-5 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-black transition cursor-pointer active:scale-95 shadow-xs"
            >
              {lt(locale, { fa: 'ثبت و انتشار نظر', en: 'Post Review', ar: 'نشر التقييم', zh: '提交评价', ru: 'Опубликовать' })}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-2.5 max-h-52 overflow-y-auto pe-1">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="p-3 rounded-xl bg-surface border border-line space-y-1.5 text-xs text-ink"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-brand/10 text-brand-dark grid place-items-center font-bold text-[10px]">
                  <User size={12} />
                </div>
                <span className="font-bold text-ink text-xs">{rev.author}</span>
                {rev.verified && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <CheckCircle2 size={10} />
                    {lt(locale, { fa: 'تاییدشده', en: 'Verified', ar: 'مؤكد', zh: '已验证', ru: 'Проверено' })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} size={12} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] text-sub">{rev.date}</span>
              </div>
            </div>

            <p className="text-[11.5px] text-sub leading-relaxed m-0">{rev.comment}</p>

            <div className="flex items-center justify-between pt-1 text-[10.5px] text-sub">
              {rev.travelType && <span>سبک سفر: {rev.travelType}</span>}
              <span className="flex items-center gap-1 font-bold text-brand-dark">
                <ThumbsUp size={11} />
                <span>مفید ({num(rev.helpfulCount || 1, locale)})</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
