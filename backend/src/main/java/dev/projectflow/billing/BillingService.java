package dev.projectflow.billing;

import dev.projectflow.billing.BillingRecords.PaymentRow;
import dev.projectflow.billing.BillingRecords.PlanState;
import dev.projectflow.config.BillingProperties;
import dev.projectflow.email.AccountEmails;
import dev.projectflow.email.EmailService;
import dev.projectflow.ops.Operators;
import dev.projectflow.security.CurrentUser;
import dev.projectflow.security.RateLimiter;
import dev.projectflow.web.error.ApiException;
import dev.projectflow.web.error.ErrorCode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Paid plans, paid by UPI straight to the operator's UPI ID (BILLING_UPI_ID).
 *
 * A personal UPI ID has no API that could tell the server a payment arrived, so:
 * 1. the customer starts a payment and gets the amount, the UPI ID and an order reference (also as
 *    a QR code and an "open UPI app" link with everything filled in);
 * 2. after paying, they enter the 12-digit UPI transaction reference (UTR) from their app;
 * 3. an operator finds that UTR in their bank app, checks the amount, and approves or rejects it;
 * 4. approving sets the account's plan until the end of the period it paid for.
 *
 * Nothing renews by itself; a week before a plan ends the customer is reminded by email.
 */
@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    private static final char[] REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray();
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);

    private final BillingRecords records;
    private final BillingProperties props;
    private final Operators operators;
    private final RateLimiter limits;
    private final EmailService email;
    private final AccountEmails emails;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public BillingService(BillingRecords records, BillingProperties props, Operators operators, RateLimiter limits, EmailService email, AccountEmails emails,
                          Clock clock) {
        this.records = records;
        this.props = props;
        this.operators = operators;
        this.limits = limits;
        this.email = email;
        this.emails = emails;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ the customer

    @Transactional(readOnly = true)
    public BillingDto.Summary summary() {
        long me = CurrentUser.id();
        Instant now = Instant.now(clock);
        PlanState state = records.plan(me);
        Plan plan = state.effective(now);
        List<BillingDto.Payment> payments = records.paymentsOf(me, 20).stream().map(this::payment).toList();
        return new BillingDto.Summary(plan.name(), state.plan().name(), state.plan().paid() ? state.expiresAt() : null, plan.maxActiveProjects(),
                plan.maxPeoplePerProject(), records.countActiveProjects(me), !props.vpa().isEmpty(), props.vpa(), props.payee(), plans(), payments);
    }

    /**
     * Starts a payment for a plan and period. An unpaid one for the same plan and period is reused
     * (so pressing the button twice doesn't make two orders); an unpaid one for something else is
     * cancelled. While a payment waits for the operator's decision, no new one can start.
     */
    @Transactional
    public BillingDto.Payment start(Plan plan, BillingPeriod period) {
        long me = CurrentUser.id();
        if (plan == null || !plan.paid()) throw ApiException.validation("plan", "Choose the Pro or Team plan.");
        if (period == null) throw ApiException.validation("period", "Choose monthly or yearly.");
        String vpa = props.vpa();
        if (vpa.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, ErrorCode.NOT_AVAILABLE, "Payments aren’t set up on this server yet. Please contact us to upgrade.", null);
        }
        limits.check("billing-start", String.valueOf(me), 30, Duration.ofHours(1));
        Instant now = Instant.now(clock);
        PlanState state = records.planForUpdate(me);
        Plan current = state.effective(now);
        if (current.paid() && current.ordinal() > plan.ordinal()) {
            throw ApiException.conflict("You’re on the " + current.label() + " plan until " + day(state.expiresAt()) + ". You can choose " + plan.label()
                    + " once it ends.", "plan");
        }
        List<PaymentRow> open = records.openPaymentsOf(me);
        for (PaymentRow row : open) {
            if (row.status() == PaymentStatus.SUBMITTED) {
                throw ApiException.conflict("Your payment " + row.reference() + " is waiting for us to confirm it. You can start another once it’s been checked.");
            }
        }
        int amount = plan.pricePaise(period);
        for (PaymentRow row : open) {
            if (row.plan() == plan && row.period() == period && row.amountPaise() == amount && row.payeeVpa().equals(vpa)) return payment(row);
            records.markCancelled(row.id(), now);
        }
        long id = records.insertPayment(me, newReference(), plan, period, amount, vpa, now);
        return payment(records.payment(id).orElseThrow());
    }

    /** The customer paid and enters the UPI transaction reference (UTR) from their payment app. */
    @Transactional
    public BillingDto.Payment submitUtr(long paymentId, String utrText) {
        long me = CurrentUser.id();
        limits.check("billing-utr", String.valueOf(me), 20, Duration.ofHours(1));
        String utr = utrText == null ? "" : utrText.replaceAll("[\\s-]+", "");
        if (!utr.matches("\\d{12}")) {
            throw ApiException.validation("utr", "Enter the 12-digit UPI reference number (UTR) from your payment app.");
        }
        PaymentRow p = mine(paymentId, me);
        if (p.status() == PaymentStatus.SUBMITTED && utr.equals(p.utr())) return payment(p); // sent twice
        if (p.status() != PaymentStatus.AWAITING_PAYMENT) throw ApiException.conflict("This payment is already " + word(p.status()) + ".");
        if (records.utrTaken(utr)) {
            throw ApiException.conflict("That UPI reference was already used for another order. Check the number, or contact us if you think it’s right.", "utr");
        }
        Instant now = Instant.now(clock);
        records.markSubmitted(p.id(), utr, now);
        String to = emails.contactAddress();
        if (email.enabled() && !to.isEmpty()) {
            email.send(emails.paymentSubmitted(to, p.userName(), p.userEmail(), p.plan().label(), p.period().label(), rupees(p.amountPaise()), p.reference(), utr));
        }
        log.info("Payment {} ({}, {}) submitted with a UTR; waiting for an operator.", p.reference(), p.plan(), rupees(p.amountPaise()));
        return payment(records.payment(p.id()).orElseThrow());
    }

    /** The customer gives up on a payment they haven't made. */
    @Transactional
    public BillingDto.Payment cancel(long paymentId) {
        long me = CurrentUser.id();
        PaymentRow p = mine(paymentId, me);
        if (p.status() == PaymentStatus.CANCELLED) return payment(p);
        if (p.status() != PaymentStatus.AWAITING_PAYMENT) {
            throw ApiException.conflict("This payment is already " + word(p.status()) + ", so it can’t be cancelled here. Contact us if something’s wrong.");
        }
        records.markCancelled(p.id(), Instant.now(clock));
        return payment(records.payment(p.id()).orElseThrow());
    }

    private PaymentRow mine(long paymentId, long me) {
        return records.paymentForUpdate(paymentId).filter(r -> r.userId() == me).orElseThrow(() -> ApiException.notFound("That payment doesn’t exist."));
    }

    // ------------------------------------------------------------------ the operator

    @Transactional(readOnly = true)
    public BillingDto.AdminList adminList(String status) {
        operators.require();
        PaymentStatus filter = null;
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            try {
                filter = PaymentStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw ApiException.validation("status", "Unknown payment status.");
            }
        }
        Map<Long, PlanState> plans = new HashMap<>();
        List<BillingDto.AdminPayment> rows = records.paymentsByStatus(filter, 200).stream()
                .map(r -> adminPayment(r, plans.computeIfAbsent(r.userId(), records::plan)))
                .toList();
        return new BillingDto.AdminList(records.countByStatus(PaymentStatus.SUBMITTED), rows);
    }

    /**
     * The operator found the money: the account gets the plan. Paying again for the plan you have
     * adds the period after the current one; switching between paid plans starts now, and the unused
     * time on the old plan is turned into time on the new one by value.
     */
    @Transactional
    public BillingDto.AdminPayment approve(long paymentId, String note) {
        operators.require();
        long operatorId = CurrentUser.id();
        Instant now = Instant.now(clock);
        PaymentRow p = records.paymentForUpdate(paymentId).orElseThrow(() -> ApiException.notFound("That payment doesn’t exist."));
        if (p.status() != PaymentStatus.SUBMITTED) throw ApiException.conflict("This payment is already " + word(p.status()) + ". Refresh the list.");
        PlanState state = records.planForUpdate(p.userId());
        Plan current = state.effective(now);
        Instant start = now;
        long creditSeconds = 0;
        if (current == p.plan()) {
            start = state.expiresAt();
        } else if (current.paid()) {
            long unused = Math.max(0, Duration.between(now, state.expiresAt()).getSeconds());
            creditSeconds = (long) Math.floor(unused * current.paisePerSecond() / p.plan().paisePerSecond());
        }
        ZoneId zone = clock.getZone();
        Instant end = p.period().after(start, zone).plusSeconds(creditSeconds);
        records.setPlan(p.userId(), p.plan(), end);
        records.markApproved(p.id(), operatorId, clean(note), now, start, end);
        if (email.enabled() && isReal(p.userEmail())) email.send(emails.paymentApproved(p.userEmail(), p.userName(), p.plan().label(), end));
        log.info("Payment {} approved: {} until {}.", p.reference(), p.plan(), end);
        PaymentRow done = records.payment(p.id()).orElseThrow();
        return adminPayment(done, records.plan(p.userId()));
    }

    /** The operator couldn't find the money, or it doesn't match. The reason is sent to the customer. */
    @Transactional
    public BillingDto.AdminPayment reject(long paymentId, String reason) {
        operators.require();
        long operatorId = CurrentUser.id();
        String why = clean(reason);
        if (why == null || why.length() < 3) throw ApiException.validation("note", "Say why, in a few words: the customer sees it.");
        PaymentRow p = records.paymentForUpdate(paymentId).orElseThrow(() -> ApiException.notFound("That payment doesn’t exist."));
        if (p.status() != PaymentStatus.SUBMITTED) throw ApiException.conflict("This payment is already " + word(p.status()) + ". Refresh the list.");
        records.markRejected(p.id(), operatorId, why, Instant.now(clock));
        if (email.enabled() && isReal(p.userEmail())) {
            email.send(emails.paymentRejected(p.userEmail(), p.userName(), p.plan().label(), rupees(p.amountPaise()), p.reference(), why));
        }
        log.info("Payment {} rejected.", p.reference());
        return adminPayment(records.payment(p.id()).orElseThrow(), records.plan(p.userId()));
    }

    // ------------------------------------------------------------------ reminders

    /** Every morning: a reminder to accounts whose paid plan ends within a week (once per period). */
    @Scheduled(cron = "0 7 4 * * *")
    @Transactional
    public void remindEndingPlans() {
        if (!email.enabled()) return;
        Instant now = Instant.now(clock);
        for (BillingRecords.Ending e : records.plansEndingBetween(now, now.plus(Duration.ofDays(7)))) {
            if (isReal(e.email())) email.send(emails.planEnding(e.email(), e.name(), e.plan().label(), e.expiresAt()));
            records.markReminded(e.userId(), e.expiresAt());
        }
    }

    // ------------------------------------------------------------------ helpers

    static List<BillingDto.PlanOption> plans() {
        return Arrays.stream(Plan.values())
                .map(p -> new BillingDto.PlanOption(p.name(), p.label(), p.pricePaise(BillingPeriod.MONTH), p.pricePaise(BillingPeriod.YEAR), p.maxActiveProjects(),
                        p.maxPeoplePerProject()))
                .toList();
    }

    private BillingDto.Payment payment(PaymentRow r) {
        boolean open = r.status() == PaymentStatus.AWAITING_PAYMENT;
        return new BillingDto.Payment(r.id(), r.reference(), r.plan().name(), r.period().name(), r.amountPaise(), r.payeeVpa(), props.payee(),
                open ? upiUri(r.payeeVpa(), props.payee(), r.amountPaise(), "Niveloft " + r.plan().label() + " " + r.reference()) : null,
                r.status().name(), r.utr(), r.createdAt(), r.submittedAt(), r.decidedAt(), r.decisionNote(), r.periodStart(), r.periodEnd());
    }

    private BillingDto.AdminPayment adminPayment(PaymentRow r, PlanState state) {
        Plan now = state.effective(Instant.now(clock));
        return new BillingDto.AdminPayment(payment(r), r.userId(), r.userName(), r.userEmail(), now.name(), now.paid() ? state.expiresAt() : null);
    }

    /**
     * A UPI payment link (NPCI's upi://pay format): payee address, payee name, amount in rupees with
     * two decimals, currency and a note. The "@" of the UPI ID stays as it is: some apps don't decode it.
     */
    static String upiUri(String vpa, String payee, int paise, String note) {
        String amount = String.format(Locale.ROOT, "%d.%02d", paise / 100, paise % 100);
        return "upi://pay?pa=" + enc(vpa).replace("%40", "@") + "&pn=" + enc(payee) + "&am=" + amount + "&cu=INR&tn=" + enc(note);
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }

    /** "₹999" or "₹1,234.50" (Indian digit grouping isn't needed below ₹1 lakh). */
    static String rupees(int paise) {
        int r = paise / 100;
        int p = paise % 100;
        String whole = String.format(Locale.ROOT, "%,d", r);
        return "₹" + whole + (p == 0 ? "" : String.format(Locale.ROOT, ".%02d", p));
    }

    private String newReference() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder b = new StringBuilder("NL");
            for (int i = 0; i < 8; i++) b.append(REFERENCE_ALPHABET[random.nextInt(REFERENCE_ALPHABET.length)]);
            String ref = b.toString();
            if (!records.referenceTaken(ref)) return ref;
        }
        throw new IllegalStateException("Couldn't find a free payment reference.");
    }

    private String day(Instant i) {
        return i == null ? "the end of the period" : DAY.format(i.atZone(clock.getZone()));
    }

    private static String word(PaymentStatus s) {
        return switch (s) {
            case AWAITING_PAYMENT -> "waiting to be paid";
            case SUBMITTED -> "waiting for confirmation";
            case APPROVED -> "approved";
            case REJECTED -> "rejected";
            case CANCELLED -> "cancelled";
        };
    }

    /** One line of plain text, at most 300 characters; blank → null. */
    private static String clean(String s) {
        if (s == null) return null;
        String t = s.replaceAll("\\s+", " ").replaceAll("\\p{Cntrl}", "").trim();
        if (t.length() > 300) t = t.substring(0, 300);
        return t.isEmpty() ? null : t;
    }

    /** Deleted accounts keep an undeliverable placeholder address. */
    private static boolean isReal(String address) {
        return address != null && !address.endsWith("@deleted.invalid");
    }
}
