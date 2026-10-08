package dev.projectflow.billing;

import dev.projectflow.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Plans and UPI payments. The customer's side needs a sign-in; the operator's side (/api/admin/…)
 * also needs an operator account (checked in {@link BillingService}).
 */
@RestController
@RequestMapping("/api")
public class BillingController {

    public record StartPayment(@NotNull(message = "Choose a plan.") Plan plan, @NotNull(message = "Choose monthly or yearly.") BillingPeriod period) {}

    public record SubmitUtr(@NotNull(message = "Enter the UPI reference number (UTR).") @Size(max = 40, message = "That doesn’t look like a UPI reference number.") String utr) {}

    public record Decision(@Size(max = 300, message = "Keep the note under 300 characters.") String note) {}

    private final BillingService billing;

    public BillingController(BillingService billing) {
        this.billing = billing;
    }

    @GetMapping("/billing")
    public ApiResponse<BillingDto.Summary> summary() {
        return ApiResponse.ok(billing.summary());
    }

    @PostMapping("/billing/payments")
    public ResponseEntity<ApiResponse<BillingDto.Payment>> start(@Valid @RequestBody StartPayment body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(billing.start(body.plan(), body.period())));
    }

    @PostMapping("/billing/payments/{id}/utr")
    public ApiResponse<BillingDto.Payment> submitUtr(@PathVariable long id, @Valid @RequestBody SubmitUtr body) {
        return ApiResponse.ok(billing.submitUtr(id, body.utr()), "Thanks! We’ll confirm your payment soon.");
    }

    @PostMapping("/billing/payments/{id}/cancel")
    public ApiResponse<BillingDto.Payment> cancel(@PathVariable long id) {
        return ApiResponse.ok(billing.cancel(id), "Payment cancelled.");
    }

    @GetMapping("/admin/payments")
    public ApiResponse<BillingDto.AdminList> adminList(@RequestParam(defaultValue = "SUBMITTED") String status) {
        return ApiResponse.ok(billing.adminList(status));
    }

    @PostMapping("/admin/payments/{id}/approve")
    public ApiResponse<BillingDto.AdminPayment> approve(@PathVariable long id, @Valid @RequestBody(required = false) Decision body) {
        return ApiResponse.ok(billing.approve(id, body == null ? null : body.note()), "Approved. Their plan is active.");
    }

    @PostMapping("/admin/payments/{id}/reject")
    public ApiResponse<BillingDto.AdminPayment> reject(@PathVariable long id, @Valid @RequestBody Decision body) {
        return ApiResponse.ok(billing.reject(id, body.note()), "Rejected. They’ll see your reason.");
    }
}
