package dev.projectflow.billing;

import java.time.Instant;
import java.util.List;

/** What the billing API sends. Amounts are in paise (₹1 = 100 paise), so they're always whole numbers. */
public final class BillingDto {

    private BillingDto() {}

    public record PlanOption(String id, String name, int monthPaise, int yearPaise, int maxActiveProjects, int maxPeoplePerProject) {}

    /**
     * One payment. {@code upiUri} (upi://pay?…) opens a UPI app with the payee, amount and note
     * filled in; the same text drawn as a QR code can be scanned from another phone.
     */
    public record Payment(long id, String reference, String plan, String period, int amountPaise, String payeeVpa, String payeeName, String upiUri,
                          String status, String utr, Instant createdAt, Instant submittedAt, Instant decidedAt, String decisionNote,
                          Instant periodStart, Instant periodEnd) {}

    /**
     * The signed-in account's plan. {@code plan} is the one that applies now; {@code paidPlan} and
     * {@code expiresAt} describe the paid period (also after it has ended). {@code payable}: this
     * server has a UPI ID to pay to.
     */
    public record Summary(String plan, String paidPlan, Instant expiresAt, int maxActiveProjects, int maxPeoplePerProject, long activeProjects,
                          boolean payable, String payeeVpa, String payeeName, List<PlanOption> plans, List<Payment> payments) {}

    /** A payment as the operator sees it: who paid, and their plan right now. */
    public record AdminPayment(Payment payment, long userId, String userName, String userEmail, String currentPlan, Instant currentExpiresAt) {}

    public record AdminList(long waiting, List<AdminPayment> payments) {}
}
