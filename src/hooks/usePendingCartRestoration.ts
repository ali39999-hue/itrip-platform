'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore, type CartItem } from '@/stores/booking-store';
import { lt } from '@/lib/lt';

export const PENDING_TOUR_CART_KEY = 'firuzo_pending_tour_cart';

export function usePendingCartRestoration() {
  const user = useAuthStore((s) => s.user);
  const addToCart = useBookingStore((s) => s.addToCart);
  const locale = useLocale();

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    try {
      const raw = sessionStorage.getItem(PENDING_TOUR_CART_KEY);
      if (!raw) return;

      const pendingItem = JSON.parse(raw) as (Omit<CartItem, 'id'> & { id?: string });
      if (pendingItem && pendingItem.type === 'TOUR') {
        sessionStorage.removeItem(PENDING_TOUR_CART_KEY);
        addToCart(pendingItem);
        toast.success(
          lt(locale, {
            fa: 'تور به سبد خرید اضافه شد',
            en: 'Tour added to cart',
            ar: 'تمت إضافة الجولة إلى السلة',
            zh: '已加入购物车',
            ru: 'Тур добавлен в корзину',
          })
        );
      }
    } catch (err) {
      console.error('Failed to restore pending tour cart item:', err);
    }
  }, [user, addToCart, locale]);
}
