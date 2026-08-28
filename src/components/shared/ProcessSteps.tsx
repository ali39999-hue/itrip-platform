interface Step {
  title: string;
  description: string;
  eta: string;
}

export function ProcessSteps({ steps }: { steps: Step[] }) {
  return (
    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ counterReset: 'step' }}>
      {steps.map((step, idx) => (
        <div key={idx} className="relative p-6 bg-surface border border-line rounded-2xl">
          <div 
            className="absolute top-4 start-5 font-en text-[28px] font-bold text-brand-dark/10 leading-none"
            style={{ counterIncrement: 'step' }}
          >
            {String(idx + 1).padStart(2, '0')}
          </div>
          <h4 className="m-0 mb-2 text-[16px] font-bold">{step.title}</h4>
          <p className="m-0 text-[14px] text-sub leading-[1.6]">
            {step.description}
          </p>
          <span className="inline-block mt-3 text-[13px] font-bold text-brand bg-mint px-3 py-0.5 rounded-full">
            {step.eta}
          </span>
        </div>
      ))}
    </div>
  );
}
