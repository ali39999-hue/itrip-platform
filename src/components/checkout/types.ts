import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import type { Passenger } from '@/lib/validations';

export type CheckoutPhase = 'passengers' | 'payment' | 'issuing' | 'success';

export type PaymentMethod = 'wallet_irr' | 'gateway';

export interface CheckoutPricing {
  baseAmount: number;
  currency: string;
  addEsim: boolean;
  addInsurance: boolean;
  esimPrice: number;
  insurancePrice: number;
  addonsTotal: number;
  discountAmount: number;
  totalPayable: number;
  formattedBase: string;
  formattedAddons: string;
  formattedDiscount: string;
  formattedTotal: string;
  formattedEsim: string;
  formattedInsurance: string;
}

export interface UseCheckoutPricingOptions {
  baseAmount?: number;
  currency?: string;
  addEsim: boolean;
  addInsurance: boolean;
  discountAmount?: number;
  esimPrice?: number;
  insurancePrice?: number;
}

export interface PassportScanResult {
  firstName: string;
  lastName: string;
  passportNo: string;
  birthDate: string;
  nationalId: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface CheckoutStepItem {
  id: CheckoutPhase;
  labelFa: string;
  labelEn: string;
  num: number;
}

export interface CheckoutStepperProps {
  phase: CheckoutPhase;
  steps?: readonly CheckoutStepItem[];
  className?: string;
}

export interface PassengerSectionProps {
  register: UseFormRegister<Passenger>;
  control: Control<Passenger>;
  errors: FieldErrors<Passenger>;
  scanning: boolean;
  onScanPassport: () => void;
  passportScanned: boolean;
}

export interface AddonsSectionProps {
  addEsim: boolean;
  setAddEsim: (value: boolean) => void;
  addInsurance: boolean;
  setAddInsurance: (value: boolean) => void;
  countryName: string;
  esimPrice?: number;
  insurancePrice?: number;
  currency?: string;
}

export interface PriceBreakdownTableProps {
  baseAmount: number;
  currency: string;
  addEsim: boolean;
  addInsurance: boolean;
  itemTitle: string;
  discountAmount?: number;
  esimPrice?: number;
  insurancePrice?: number;
}

export interface PaymentGatewaySelectorProps {
  method: PaymentMethod;
  setMethod: (method: PaymentMethod) => void;
  walletBalance: number;
  totalPayable: number;
  currency?: string;
}

export interface IssuingModalProps {
  countdown: number;
  issueStep: number;
  steps?: readonly string[];
}

export interface SuccessConfirmationProps {
  confirmedRef: string;
  confirmedTitle: string;
  onViewTrips?: () => void;
  onDownloadPdf?: () => void;
}
