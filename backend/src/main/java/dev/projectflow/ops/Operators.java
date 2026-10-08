package dev.projectflow.ops;

import dev.projectflow.config.AppProperties;
import dev.projectflow.config.OperatorProperties;
import dev.projectflow.domain.User;
import dev.projectflow.security.CurrentUser;
import dev.projectflow.web.error.ApiException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Who runs this site (OPERATOR_EMAILS). Only they may see Site health, contact messages and the
 * payments waiting for approval.
 *
 * When this server delivers email, an operator's account must also have confirmed its address, so
 * nobody can become an operator by signing up with the operator's email before they do. (Without
 * email nobody can confirm anything: then the operator should create their account straight after
 * the first deploy; see DEPLOYMENT.md.)
 */
@Component
public class Operators {

    private final Set<String> emails;
    private final JdbcTemplate jdbc;
    private final boolean emailConfirmable;

    public Operators(OperatorProperties props) {
        this(props, null, null);
    }

    @Autowired
    public Operators(OperatorProperties props, JdbcTemplate jdbc, AppProperties app) {
        String raw = props == null || props.emails() == null ? "" : props.emails();
        this.emails = Arrays.stream(raw.split("[,;\\s]+"))
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .filter(e -> e.contains("@"))
                .collect(Collectors.toUnmodifiableSet());
        this.jdbc = jdbc;
        this.emailConfirmable = app != null && app.email() != null && "resend".equals(app.email().providerOrNone());
    }

    /** Whether the address is on the operators' list (see {@link #isOperator(User)} for a whole account). */
    public boolean isOperator(String email) {
        return email != null && emails.contains(email.trim().toLowerCase(Locale.ROOT));
    }

    /** On the list, and (when this server delivers email) with a confirmed address. */
    public boolean isOperator(User u) {
        return u != null && isOperator(u.getEmail()) && (!emailConfirmable || u.isEmailVerified());
    }

    public boolean configured() {
        return !emails.isEmpty();
    }

    /** The signed-in person must be an operator (403 otherwise, without saying who is). */
    public void require() {
        var me = CurrentUser.get();
        if (!isOperator(me.email()) || (emailConfirmable && !confirmed(me.id()))) {
            throw ApiException.forbidden("Only the people who run this site can open this page.");
        }
    }

    private boolean confirmed(Long userId) {
        if (jdbc == null || userId == null) return false;
        Boolean ok = jdbc.query("SELECT email_verified_at FROM users WHERE id = ?", rs -> rs.next() ? rs.getTimestamp(1) != null : Boolean.FALSE, userId);
        return Boolean.TRUE.equals(ok);
    }
}
