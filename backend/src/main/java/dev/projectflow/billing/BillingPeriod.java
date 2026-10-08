package dev.projectflow.billing;

import java.time.Instant;
import java.time.ZoneId;

/** How long one payment buys: a month or a year (calendar months, in the server's time zone). */
public enum BillingPeriod {
    MONTH(1),
    YEAR(12);

    private final int months;

    BillingPeriod(int months) {
        this.months = months;
    }

    public Instant after(Instant start, ZoneId zone) {
        return start.atZone(zone).plusMonths(months).toInstant();
    }

    public String label() {
        return this == YEAR ? "1 year" : "1 month";
    }
}
