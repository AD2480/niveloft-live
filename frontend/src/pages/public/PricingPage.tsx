import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import { PublicPage } from '@/components/layout/PublicFrame';
import { buttonClass } from '@/components/ui/buttonStyles';
import { PricingPlans } from '@/features/public/PricingPlans';
import { PRICING_FAQ } from '@/features/public/pricing';
import { openContact } from '@/features/contact/contactStore';
import { usePageMeta } from '@/lib/pageMeta';

/** /pricing: the plans, the questions people ask about paying, and a way in. */
export function PricingPage() {
  usePageMeta({ title: 'Pricing', path: '/pricing' });
  return (
    <PublicPage>
      <section className="relative overflow-hidden border-b border-line" aria-labelledby="pricing-title">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_0%,color-mix(in_srgb,var(--frost)_35%,transparent),transparent_70%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1320px] px-4 pt-16 pb-20 sm:px-8 lg:pt-24 lg:pb-28">
          <div className="mx-auto max-w-[720px] text-center">
            <p className="text-[13.5px] font-medium text-accent">Pricing</p>
            <h1 id="pricing-title" className="display-wide mt-3 text-[38px] text-ink sm:text-[54px]">
              Start free. Pay when your team grows.
            </h1>
            <p className="mx-auto mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">
              One price for the whole workspace, in rupees, paid by UPI from any UPI app. Your clients join as viewers at no cost, so you never pay for the people you deliver to.
            </p>
          </div>
          <div className="mt-14">
            <PricingPlans />
          </div>
        </div>
      </section>

      <section className="bg-canvas" aria-labelledby="pricing-faq-title">
        <div className="mx-auto max-w-[860px] px-4 py-20 sm:px-8 lg:py-24">
          <h2 id="pricing-faq-title" className="display-wide text-[30px] text-ink sm:text-[38px]">
            Questions about plans
          </h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {PRICING_FAQ.map((item) => (
              <details key={item.q} className="disclosure group">
                <summary className="flex items-start gap-4 py-5 transition-colors hover:text-accent">
                  <h3 className="min-w-0 flex-1 text-[16.5px] leading-snug font-medium text-ink">{item.q}</h3>
                  <ChevronDown className="disclosure-icon mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
                </summary>
                <div className="disclosure-body max-w-[70ch] pb-6 text-[15px] leading-relaxed text-ink-2">
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Link to="/register" className={buttonClass('primary', 'lg')}>
              Start free
            </Link>
            <button type="button" onClick={() => openContact({ topic: 'QUESTION', message: 'I have a question about plans or payment.' })} className={buttonClass('secondary', 'lg')}>
              Ask us a question
            </button>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
