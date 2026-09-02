'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { Scan, User, Camera, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { passengerSchema, Passenger } from '@/lib/validations';
import { useBookingStore } from '@/stores/booking-store';

export function PassengerForm({ onChange }: { onChange?: (p: Passenger) => void }) {
  const t = useTranslations('PassengerForm');
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const setPassengers = useBookingStore((s) => s.setPassengers);
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Passenger>({
    resolver: zodResolver(passengerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nationalId: '',
      passportNo: '',
      birthDate: '',
      gender: 'MALE'
    }
  });

  const updateStore = (p: Passenger) => {
    setPassengers([{
      firstNameFa: p.firstName || '',
      lastNameFa: p.lastName || '',
      firstNameEn: p.firstName || '',
      lastNameEn: p.lastName || '',
      passportNo: p.passportNo || '',
      nationalId: p.nationalId || undefined,
      birthDate: p.birthDate || '',
      gender: p.gender === 'FEMALE' ? 'female' : 'male',
    }]);
    onChange?.(p);
  };

  const handleScan = () => {
    setIsScanning(true);
    // Mocking an OCR scan delay
    setTimeout(() => {
      setValue('firstName', 'ALI');
      setValue('lastName', 'MOHAMMADI');
      setValue('passportNo', 'L2948175');
      setValue('birthDate', '1985-11-20');
      setValue('nationalId', '0123456789');
      setValue('gender', 'MALE');
      setIsScanning(false);
      setScanComplete(true);
      updateStore({
        firstName: 'ALI',
        lastName: 'MOHAMMADI',
        passportNo: 'L2948175',
        birthDate: '1985-11-20',
        nationalId: '0123456789',
        gender: 'MALE'
      });
    }, 1200);
  };

  const onSubmit = (data: Passenger) => {
    updateStore(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-surface rounded-xl border border-line p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <User size={20} className="text-brand-dark" />
          {t('title')}
        </h2>
        
        {/* OCR Button */}
        <Button 
          type="button"
          variant={scanComplete ? "outline" : "default"}
          className={scanComplete ? "border-brand text-brand-dark bg-mint" : "bg-action hover:bg-action-hover text-ink"}
          onClick={handleScan}
          disabled={isScanning || scanComplete}
        >
          {isScanning ? (
            <span className="flex items-center gap-2 animate-pulse">
              <Scan size={18} /> {t('scanning')}
            </span>
          ) : scanComplete ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} /> {t('scanned')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Camera size={18} /> {t('scanOcr')}
            </span>
          )}
        </Button>
      </div>

      <div className="bg-mint text-brand-dark text-sm p-4 rounded-lg mb-6">
        {t('notice')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink">{t('firstNameEn')}</label>
          <Input 
            {...register('firstName')}
            className="bg-soft uppercase" 
            placeholder="FIRST NAME"
            dir="ltr"
          />
          {errors.firstName && <span className="text-rose-warm text-xs font-medium">{errors.firstName.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink">{t('lastNameEn')}</label>
          <Input 
            {...register('lastName')}
            className="bg-soft uppercase" 
            placeholder="LAST NAME"
            dir="ltr"
          />
          {errors.lastName && <span className="text-rose-warm text-xs font-medium">{errors.lastName.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink">{t('passportNo')}</label>
          <Input 
            {...register('passportNo')}
            className="bg-soft uppercase font-mono" 
            placeholder="Lxxxxxxx"
            dir="ltr"
          />
          {errors.passportNo && <span className="text-rose-warm text-xs font-medium">{errors.passportNo.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink">{t('nationalId')}</label>
          <Input 
            {...register('nationalId')}
            className="bg-soft uppercase" 
            placeholder="0123456789" inputMode="numeric"
            dir="ltr"
          />
          {errors.nationalId && <span className="text-rose-warm text-xs font-medium">{errors.nationalId.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink">{t('birthDate')}</label>
          <Input 
            type="date"
            {...register('birthDate')}
            className="bg-soft text-start" 
            dir="ltr"
          />
          {errors.birthDate && <span className="text-rose-warm text-xs font-medium">{errors.birthDate.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink">{t('gender')}</label>
          <select {...register('gender')} className="flex h-10 w-full rounded-md border border-input bg-soft px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 uppercase">
            <option value="MALE">{t('male')}</option>
            <option value="FEMALE">{t('female')}</option>
          </select>
          {errors.gender && <span className="text-rose-warm text-xs font-medium">{errors.gender.message}</span>}
        </div>
      </div>
    </form>
  );
}

