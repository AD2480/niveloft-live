import { describe, expect, it } from 'vitest';
import { formatPaise, formatRupees, monthsFree, planById, planLink, PLANS, priceOf, toPeriod } from './pricing';

describe('pricing', () => {
  it('matches the server’s prices (billing/Plan.java)', () => {
    const byId = Object.fromEntries(PLANS.map((p) => [p.id, [p.monthly, p.yearly, p.maxActiveProjects, p.maxPeople]]));
    expect(byId).toEqual({ free: [0, 0, 3, 5], pro: [999, 9990, 0, 15], team: [2499, 24990, 0, 50] });
  });

  it('gives two months free on a year, for every paid plan', () => {
    expect(monthsFree()).toBe(2);
    for (const p of PLANS.filter((x) => x.monthly > 0)) expect(p.yearly, p.id).toBe(p.monthly * 10);
  });

  it('formats rupees the Indian way', () => {
    expect(formatRupees(999)).toBe('₹999');
    expect(formatRupees(24990)).toBe('₹24,990');
    expect(formatRupees(100000)).toBe('₹1,00,000');
    expect(formatPaise(12345)).toBe('₹123.45');
  });

  it('finds plans and periods from links', () => {
    expect(planById('PRO')?.name).toBe('Pro');
    expect(planById('nope')).toBeUndefined();
    expect(planById(null)).toBeUndefined();
    expect(toPeriod('month')).toBe('month');
    expect(toPeriod('YEAR')).toBe('year');
    expect(toPeriod(null)).toBe('year');
    expect(priceOf(PLANS[1], 'year')).toBe(9990);
  });

  it('sends visitors to sign-up and signed-in people to payment', () => {
    const pro = planById('pro')!;
    expect(planLink(pro, 'year', false)).toBe('/register?plan=pro&period=year');
    expect(planLink(pro, 'month', true)).toBe('/settings?tab=billing&plan=pro&period=month');
    expect(planLink(PLANS[0], 'year', false)).toBe('/register');
  });
});
