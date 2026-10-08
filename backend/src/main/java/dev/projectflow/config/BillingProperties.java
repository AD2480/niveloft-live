package dev.projectflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Paid plans, paid by UPI straight to the operator's UPI ID (see the billing package).
 *
 * @param upiId         where customers pay (BILLING_UPI_ID), e.g. name@okhdfcbank
 * @param payeeName     the name UPI apps show for the payee (BILLING_PAYEE_NAME)
 * @param enforceLimits whether plan limits (active projects, people per project) apply; on unless
 *                      turned off (only the test suite does, so older tests can create freely)
 */
@ConfigurationProperties(prefix = "projectflow.billing")
public record BillingProperties(String upiId, String payeeName, Boolean enforceLimits) {

    /** The UPI ID, trimmed, or "" when none is set (then nobody can start a payment). */
    public String vpa() {
        return upiId == null ? "" : upiId.trim();
    }

    public String payee() {
        return payeeName == null || payeeName.isBlank() ? "Niveloft" : payeeName.trim();
    }

    public boolean enforced() {
        return enforceLimits == null || enforceLimits;
    }
}
