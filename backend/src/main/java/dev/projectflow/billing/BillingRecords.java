package dev.projectflow.billing;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;

/**
 * Plans and payments in the database (V7). Plain SQL, like the site's own records. The
 * "for update" reads lock the row until the transaction ends, so two operators approving at the
 * same moment, or two approvals for one account, can't both apply.
 */
@Component
public class BillingRecords {

    /** What a payment row holds, with the customer's name and email for the operator's list. */
    public record PaymentRow(long id, long userId, String userName, String userEmail, String reference, Plan plan, BillingPeriod period,
                             int amountPaise, String payeeVpa, PaymentStatus status, String utr, Instant createdAt, Instant submittedAt,
                             Instant decidedAt, String decisionNote, Instant periodStart, Instant periodEnd) {}

    /** The plan an account has paid for, and until when (null for Free). */
    public record PlanState(Plan plan, Instant expiresAt) {

        /** The plan that applies at {@code now}: the paid one until it runs out, then Free. */
        public Plan effective(Instant now) {
            return plan.paid() && expiresAt != null && expiresAt.isAfter(now) ? plan : Plan.FREE;
        }
    }

    private static final String PAYMENT_COLUMNS = """
            p.id, p.user_id, u.name AS user_name, u.email AS user_email, p.reference, p.plan, p.period, p.amount_paise, p.payee_vpa, p.status,
            p.utr, p.created_at, p.submitted_at, p.decided_at, p.decision_note, p.period_start, p.period_end""";

    private final JdbcTemplate jdbc;

    public BillingRecords(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ------------------------------------------------------------------ plans

    public PlanState plan(long userId) {
        return planQuery("SELECT plan, plan_expires_at FROM users WHERE id = ?", userId);
    }

    /** The same, locking the account row until the transaction ends. */
    public PlanState planForUpdate(long userId) {
        return planQuery("SELECT plan, plan_expires_at FROM users WHERE id = ? FOR UPDATE", userId);
    }

    private PlanState planQuery(String sql, long userId) {
        List<PlanState> rows = jdbc.query(sql, (rs, i) -> new PlanState(parsePlan(rs.getString(1)), instant(rs, 2)), userId);
        return rows.isEmpty() ? new PlanState(Plan.FREE, null) : rows.get(0);
    }

    public void setPlan(long userId, Plan plan, Instant expiresAt) {
        jdbc.update("UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?", plan.name(), ts(expiresAt), userId);
    }

    /** Projects the account owns that are active or on hold (completed and archived ones are free). */
    public long countActiveProjects(long ownerId) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM projects WHERE owner_id = ? AND status IN ('ACTIVE', 'ON_HOLD')", Long.class, ownerId);
        return n == null ? 0 : n;
    }

    /** Owners, managers and members of a project, plus pending invitations for those roles. Viewers don't count. */
    public long countPeople(long projectId) {
        Long members = jdbc.queryForObject("SELECT COUNT(*) FROM project_members WHERE project_id = ? AND role <> 'VIEWER'", Long.class, projectId);
        Long invited = jdbc.queryForObject("SELECT COUNT(*) FROM invitations WHERE project_id = ? AND status = 'PENDING' AND role <> 'VIEWER'", Long.class,
                projectId);
        return (members == null ? 0 : members) + (invited == null ? 0 : invited);
    }

    public Optional<Long> ownerOf(long projectId) {
        return jdbc.query("SELECT owner_id FROM projects WHERE id = ?", (rs, i) -> rs.getLong(1), projectId).stream().findFirst();
    }

    /** An account whose paid plan ends soon and hasn't been reminded for this period yet. */
    public record Ending(long userId, String name, String email, Plan plan, Instant expiresAt) {}

    public List<Ending> plansEndingBetween(Instant from, Instant to) {
        return jdbc.query("""
                SELECT id, name, email, plan, plan_expires_at FROM users
                WHERE plan <> 'FREE' AND plan_expires_at > ? AND plan_expires_at <= ?
                  AND (plan_reminded_for IS NULL OR plan_reminded_for <> plan_expires_at)""",
                (rs, i) -> new Ending(rs.getLong(1), rs.getString(2), rs.getString(3), parsePlan(rs.getString(4)), instant(rs, 5)),
                Timestamp.from(from), Timestamp.from(to));
    }

    public void markReminded(long userId, Instant expiresAt) {
        jdbc.update("UPDATE users SET plan_reminded_for = ? WHERE id = ?", Timestamp.from(expiresAt), userId);
    }

    // ------------------------------------------------------------------ payments

    public long insertPayment(long userId, String reference, Plan plan, BillingPeriod period, int amountPaise, String payeeVpa, Instant now) {
        KeyHolder key = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO payments (user_id, reference, plan, period, amount_paise, payee_vpa, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", new String[] {"id"});
            ps.setLong(1, userId);
            ps.setString(2, reference);
            ps.setString(3, plan.name());
            ps.setString(4, period.name());
            ps.setInt(5, amountPaise);
            ps.setString(6, payeeVpa);
            ps.setString(7, PaymentStatus.AWAITING_PAYMENT.name());
            ps.setTimestamp(8, Timestamp.from(now));
            return ps;
        }, key);
        Number id = key.getKey();
        if (id == null) throw new IllegalStateException("The database didn't return the new payment's id.");
        return id.longValue();
    }

    public boolean referenceTaken(String reference) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE reference = ?", Long.class, reference);
        return n != null && n > 0;
    }

    public boolean utrTaken(String utr) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE utr = ?", Long.class, utr);
        return n != null && n > 0;
    }

    public Optional<PaymentRow> payment(long id) {
        return one("SELECT " + PAYMENT_COLUMNS + " FROM payments p JOIN users u ON u.id = p.user_id WHERE p.id = ?", id);
    }

    /** The payment, locking its row until the transaction ends. */
    public Optional<PaymentRow> paymentForUpdate(long id) {
        // Lock first (plain row lock), then read with the join: some databases refuse FOR UPDATE on joins.
        List<Long> locked = jdbc.query("SELECT id FROM payments WHERE id = ? FOR UPDATE", (rs, i) -> rs.getLong(1), id);
        return locked.isEmpty() ? Optional.empty() : payment(id);
    }

    public List<PaymentRow> paymentsOf(long userId, int limit) {
        return jdbc.query("SELECT " + PAYMENT_COLUMNS + " FROM payments p JOIN users u ON u.id = p.user_id WHERE p.user_id = ? ORDER BY p.created_at DESC, p.id DESC LIMIT ?",
                BillingRecords::row, userId, limit);
    }

    /** The person's open payments (waiting to be paid, or paid and waiting for a decision), newest first. */
    public List<PaymentRow> openPaymentsOf(long userId) {
        return jdbc.query("SELECT " + PAYMENT_COLUMNS + " FROM payments p JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND p.status IN ('AWAITING_PAYMENT', 'SUBMITTED') ORDER BY p.created_at DESC, p.id DESC",
                BillingRecords::row, userId);
    }

    /** For the operator: payments in one state (SUBMITTED first-in-first-out), or every payment, newest first. */
    public List<PaymentRow> paymentsByStatus(PaymentStatus status, int limit) {
        if (status == null) {
            return jdbc.query("SELECT " + PAYMENT_COLUMNS + " FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC, p.id DESC LIMIT ?",
                    BillingRecords::row, limit);
        }
        String order = status == PaymentStatus.SUBMITTED ? "p.submitted_at ASC, p.id ASC" : "p.created_at DESC, p.id DESC";
        return jdbc.query("SELECT " + PAYMENT_COLUMNS + " FROM payments p JOIN users u ON u.id = p.user_id WHERE p.status = ? ORDER BY " + order + " LIMIT ?",
                BillingRecords::row, status.name(), limit);
    }

    public long countByStatus(PaymentStatus status) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE status = ?", Long.class, status.name());
        return n == null ? 0 : n;
    }

    public void markSubmitted(long id, String utr, Instant now) {
        jdbc.update("UPDATE payments SET status = 'SUBMITTED', utr = ?, submitted_at = ? WHERE id = ?", utr, Timestamp.from(now), id);
    }

    public void markCancelled(long id, Instant now) {
        jdbc.update("UPDATE payments SET status = 'CANCELLED', decided_at = ? WHERE id = ?", Timestamp.from(now), id);
    }

    public void markApproved(long id, long operatorId, String note, Instant now, Instant periodStart, Instant periodEnd) {
        jdbc.update("""
                UPDATE payments SET status = 'APPROVED', decided_at = ?, decided_by_id = ?, decision_note = ?, period_start = ?, period_end = ?
                WHERE id = ?""", Timestamp.from(now), operatorId, note, Timestamp.from(periodStart), Timestamp.from(periodEnd), id);
    }

    public void markRejected(long id, long operatorId, String note, Instant now) {
        // The UTR is released, so a genuine reference typed into the wrong order can be used again.
        jdbc.update("UPDATE payments SET status = 'REJECTED', utr = NULL, decided_at = ?, decided_by_id = ?, decision_note = ? WHERE id = ?",
                Timestamp.from(now), operatorId, note, id);
    }

    // ------------------------------------------------------------------ helpers

    private Optional<PaymentRow> one(String sql, Object... args) {
        return jdbc.query(sql, BillingRecords::row, args).stream().findFirst();
    }

    private static PaymentRow row(ResultSet rs, int i) throws SQLException {
        return new PaymentRow(rs.getLong("id"), rs.getLong("user_id"), rs.getString("user_name"), rs.getString("user_email"), rs.getString("reference"),
                Plan.valueOf(rs.getString("plan")), BillingPeriod.valueOf(rs.getString("period")), rs.getInt("amount_paise"), rs.getString("payee_vpa"),
                PaymentStatus.valueOf(rs.getString("status")), rs.getString("utr"), instant(rs, "created_at"), instant(rs, "submitted_at"),
                instant(rs, "decided_at"), rs.getString("decision_note"), instant(rs, "period_start"), instant(rs, "period_end"));
    }

    private static Plan parsePlan(String s) {
        if (s == null) return Plan.FREE;
        try {
            return Plan.valueOf(s);
        } catch (IllegalArgumentException e) {
            return Plan.FREE;
        }
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp t = rs.getTimestamp(column);
        return t == null ? null : t.toInstant();
    }

    private static Instant instant(ResultSet rs, int column) throws SQLException {
        Timestamp t = rs.getTimestamp(column);
        return t == null ? null : t.toInstant();
    }

    private static Timestamp ts(Instant i) {
        return i == null ? null : Timestamp.from(i);
    }
}
