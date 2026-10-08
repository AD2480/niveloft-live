package dev.projectflow.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Plans and UPI payments through the real HTTP API: the Free plan's limits, starting a payment,
 * entering the UTR, and an operator approving or rejecting it.
 */
@SpringBootTest(properties = {
        "projectflow.operators.emails=billing-boss@test.dev",
        "projectflow.billing.enforce-limits=true",
        "projectflow.billing.upi-id=shop@okbank",
})
@AutoConfigureMockMvc
class BillingTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    record Account(long id, String token) {}

    int n;

    @BeforeEach
    void setUp() {
        n = SEQ.incrementAndGet();
    }

    private Account register(String email) throws Exception {
        String res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Bill Ing", "email", email, "password", "Password123", "acceptTerms", true))))
                .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString();
        return new Account(((Number) JsonPath.read(res, "$.data.user.id")).longValue(), JsonPath.read(res, "$.data.token"));
    }

    private Account boss() throws Exception {
        String res = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", "billing-boss@test.dev", "password", "Password123")))).andReturn().getResponse().getContentAsString();
        if (res.contains("\"token\"")) return new Account(((Number) JsonPath.read(res, "$.data.user.id")).longValue(), JsonPath.read(res, "$.data.token"));
        return register("billing-boss@test.dev");
    }

    private ResultActions call(Account who, MockHttpServletRequestBuilder req, Object body) throws Exception {
        if (who != null) req.header("Authorization", "Bearer " + who.token());
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        return mvc.perform(req);
    }

    private static String body(ResultActions r) throws Exception {
        return r.andReturn().getResponse().getContentAsString();
    }

    private ResultActions createProject(Account who, String key) throws Exception {
        return call(who, post("/api/projects"), Map.of("name", "Project " + key, "key", key, "startDate", LocalDate.now().toString()));
    }

    /** A UTR nobody else in this test run has used. */
    private String utr(int salt) {
        return String.format("%012d", 700000000000L + n * 100L + salt);
    }

    @Test
    @DisplayName("Free: three active projects; a paid, approved Pro plan lifts the limit")
    void freeLimitThenPro() throws Exception {
        Account me = register("billing-free" + n + "@test.dev");
        for (int i = 1; i <= 3; i++) createProject(me, "BF" + n + i).andExpect(status().isCreated());
        createProject(me, "BF" + n + "4").andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

        String started = body(call(me, post("/api/billing/payments"), Map.of("plan", "PRO", "period", "MONTH")).andExpect(status().isCreated()));
        long paymentId = ((Number) JsonPath.read(started, "$.data.id")).longValue();
        assertThat((Integer) JsonPath.read(started, "$.data.amountPaise")).isEqualTo(99900);
        String uri = JsonPath.read(started, "$.data.upiUri");
        assertThat(uri).startsWith("upi://pay?pa=shop@okbank&").contains("am=999.00").contains("cu=INR");

        // Pressing the button again gives the same order, not a second one.
        String again = body(call(me, post("/api/billing/payments"), Map.of("plan", "PRO", "period", "MONTH")).andExpect(status().isCreated()));
        assertThat(((Number) JsonPath.read(again, "$.data.id")).longValue()).isEqualTo(paymentId);

        call(me, post("/api/billing/payments/" + paymentId + "/utr"), Map.of("utr", "12345")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.utr").exists());
        call(me, post("/api/billing/payments/" + paymentId + "/utr"), Map.of("utr", utr(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"));

        // Only operators see and decide payments.
        call(me, get("/api/admin/payments"), null).andExpect(status().isForbidden());
        call(me, post("/api/admin/payments/" + paymentId + "/approve"), Map.of()).andExpect(status().isForbidden());

        Account boss = boss();
        String waiting = body(call(boss, get("/api/admin/payments"), null).andExpect(status().isOk()));
        assertThat(waiting).contains(utr(1));
        call(boss, post("/api/admin/payments/" + paymentId + "/approve"), Map.of("note", "Found it")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.payment.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.currentPlan").value("PRO"));
        call(boss, post("/api/admin/payments/" + paymentId + "/approve"), Map.of()).andExpect(status().isConflict());

        call(me, get("/api/billing"), null).andExpect(status().isOk()).andExpect(jsonPath("$.data.plan").value("PRO"))
                .andExpect(jsonPath("$.data.maxActiveProjects").value(0));
        createProject(me, "BF" + n + "4").andExpect(status().isCreated());

        // One UTR pays for one order.
        String next = body(call(me, post("/api/billing/payments"), Map.of("plan", "PRO", "period", "YEAR")).andExpect(status().isCreated()));
        long nextId = ((Number) JsonPath.read(next, "$.data.id")).longValue();
        call(me, post("/api/billing/payments/" + nextId + "/utr"), Map.of("utr", utr(1))).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("a rejected payment changes nothing, needs a reason, and frees the UTR")
    void rejected() throws Exception {
        Account me = register("billing-reject" + n + "@test.dev");
        String started = body(call(me, post("/api/billing/payments"), Map.of("plan", "TEAM", "period", "YEAR")).andExpect(status().isCreated()));
        long paymentId = ((Number) JsonPath.read(started, "$.data.id")).longValue();
        assertThat((Integer) JsonPath.read(started, "$.data.amountPaise")).isEqualTo(2499000);
        call(me, post("/api/billing/payments/" + paymentId + "/utr"), Map.of("utr", utr(2))).andExpect(status().isOk());
        // While it waits, no second payment can start.
        call(me, post("/api/billing/payments"), Map.of("plan", "PRO", "period", "MONTH")).andExpect(status().isConflict());

        Account boss = boss();
        call(boss, post("/api/admin/payments/" + paymentId + "/reject"), Map.of("note", "")).andExpect(status().isBadRequest());
        call(boss, post("/api/admin/payments/" + paymentId + "/reject"), Map.of("note", "No payment with this UTR")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.payment.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.currentPlan").value("FREE"));
        call(me, get("/api/billing"), null).andExpect(jsonPath("$.data.plan").value("FREE"))
                .andExpect(jsonPath("$.data.payments[0].decisionNote").value("No payment with this UTR"));

        String retry = body(call(me, post("/api/billing/payments"), Map.of("plan", "TEAM", "period", "YEAR")).andExpect(status().isCreated()));
        long retryId = ((Number) JsonPath.read(retry, "$.data.id")).longValue();
        call(me, post("/api/billing/payments/" + retryId + "/utr"), Map.of("utr", utr(2))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Free: five people per project, and viewers (clients) are always free")
    void seats() throws Exception {
        Account owner = register("billing-seats" + n + "@test.dev");
        String p = body(createProject(owner, "BS" + n).andExpect(status().isCreated()));
        long projectId = ((Number) JsonPath.read(p, "$.data.id")).longValue();
        for (int i = 1; i <= 4; i++) {
            call(owner, post("/api/projects/" + projectId + "/invitations"), Map.of("email", "seat" + n + "-" + i + "@test.dev", "role", "MEMBER"))
                    .andExpect(status().isCreated());
        }
        call(owner, post("/api/projects/" + projectId + "/invitations"), Map.of("email", "seat" + n + "-5@test.dev", "role", "MEMBER"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
        call(owner, post("/api/projects/" + projectId + "/invitations"), Map.of("email", "client" + n + "@test.dev", "role", "VIEWER"))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("UPI links carry the payee, the amount in rupees and an encoded note")
    void upiLink() {
        assertThat(BillingService.upiUri("name@okhdfcbank", "Niveloft", 99900, "Niveloft Pro NL2345ABCD"))
                .isEqualTo("upi://pay?pa=name@okhdfcbank&pn=Niveloft&am=999.00&cu=INR&tn=Niveloft%20Pro%20NL2345ABCD");
        assertThat(BillingService.rupees(2499000)).isEqualTo("₹24,990");
        assertThat(BillingService.rupees(12345)).isEqualTo("₹123.45");
    }
}
