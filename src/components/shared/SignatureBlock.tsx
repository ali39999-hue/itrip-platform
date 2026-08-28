import { Star } from 'lucide-react';

interface SignatureBlockProps {
  title: string;
  description: React.ReactNode;
}

export function SignatureBlock({ title, description }: SignatureBlockProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start p-6 bg-mint/50 border border-brand/30 rounded-2xl relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute -end-5 -top-5 w-24 h-24 bg-brand/20 rounded-full opacity-50 pointer-events-none" />
      
      <span className="flex-shrink-0 w-12 h-12 grid place-items-center rounded-full bg-brand text-surface z-10">
        <Star size={24} />
      </span>
      <div className="z-10 relative">
        <h3 className="m-0 mb-2 text-[18px] text-brand-dark flex flex-wrap items-center gap-2 font-bold">
          <span className="text-[11px] bg-action text-[#14201f] px-2 py-0.5 rounded-full font-black">امضای فیروز</span>
          {title}
        </h3>
        <p className="m-0 text-[14px] text-brand-dark/80 leading-[1.75]">
          {description}
        </p>
      </div>
    </div>
  );
}
