package dev.projectflow.email;

/**
 * One outgoing email, with a plain-text body and an HTML body saying the same thing.
 * {@code replyTo}, when set, is where replies go instead of the site's usual reply address
 * (a contact message's sender, so the operator can simply press Reply).
 */
public record EmailMessage(String to, String subject, String text, String html, String replyTo) {

    public EmailMessage(String to, String subject, String text, String html) {
        this(to, subject, text, html, null);
    }
}
