-- Paid plans, paid by UPI straight to the operator's UPI ID. A personal UPI ID has no API, so each
-- payment is confirmed by hand: the customer enters the UPI transaction reference (UTR) and an
-- operator approves it after finding it in their bank app. Approving sets the account's plan.

-- The plan an account has paid for, and until when. Past plan_expires_at the account is on FREE.
ALTER TABLE users ADD COLUMN plan VARCHAR(16) NOT NULL DEFAULT 'FREE';
ALTER TABLE users ADD COLUMN plan_expires_at DATETIME(6);
-- The plan_expires_at a "your plan ends soon" email was sent for (so it's sent once per period).
ALTER TABLE users ADD COLUMN plan_reminded_for DATETIME(6);

CREATE TABLE payments (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT       NOT NULL,
    -- Shown to the customer and put in the UPI note, so the operator can match the money to the order.
    reference      VARCHAR(16)  NOT NULL,
    plan           VARCHAR(16)  NOT NULL,
    period         VARCHAR(8)   NOT NULL,
    amount_paise   INT          NOT NULL,
    -- The UPI ID the customer was asked to pay (kept in case BILLING_UPI_ID changes later).
    payee_vpa      VARCHAR(100) NOT NULL,
    status         VARCHAR(20)  NOT NULL,
    -- The 12-digit UPI transaction reference the customer entered. One UTR pays for one order.
    utr            VARCHAR(20),
    created_at     DATETIME(6)  NOT NULL,
    submitted_at   DATETIME(6),
    decided_at     DATETIME(6),
    decided_by_id  BIGINT,
    decision_note  VARCHAR(300),
    period_start   DATETIME(6),
    period_end     DATETIME(6),
    CONSTRAINT uk_payments_reference UNIQUE (reference),
    CONSTRAINT uk_payments_utr UNIQUE (utr),
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_payments_decided_by FOREIGN KEY (decided_by_id) REFERENCES users (id),
    CONSTRAINT ck_payments_plan CHECK (plan IN ('PRO', 'TEAM')),
    CONSTRAINT ck_payments_period CHECK (period IN ('MONTH', 'YEAR')),
    CONSTRAINT ck_payments_status CHECK (status IN ('AWAITING_PAYMENT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT ck_payments_amount CHECK (amount_paise > 0)
);
CREATE INDEX ix_payments_user ON payments (user_id, created_at);
CREATE INDEX ix_payments_status ON payments (status, submitted_at);
-- Plan limits count a person's active projects.
CREATE INDEX ix_projects_owner_status ON projects (owner_id, status);
