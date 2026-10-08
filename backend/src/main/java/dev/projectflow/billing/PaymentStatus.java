package dev.projectflow.billing;

/** Where a UPI payment is: started, paid (UTR entered), then approved or rejected by an operator. */
public enum PaymentStatus {
    /** Started: the customer has the amount, UPI ID and reference, and hasn't entered a UTR yet. */
    AWAITING_PAYMENT,
    /** The customer entered the UTR; an operator has to find the money and decide. */
    SUBMITTED,
    /** The money arrived; the plan was extended. */
    APPROVED,
    /** The operator couldn't find the money (or it didn't match); nothing changed. */
    REJECTED,
    /** The customer gave up before paying, or started a different payment instead. */
    CANCELLED
}
