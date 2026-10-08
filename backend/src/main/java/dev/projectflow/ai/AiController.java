package dev.projectflow.ai;

import dev.projectflow.web.ApiResponse;
import dev.projectflow.web.dto.Dto;
import dev.projectflow.web.dto.Requests;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * AI assistance endpoints. Every call checks the caller's access first; when no provider is
 * configured the calls fail with AI_UNAVAILABLE rather than returning anything invented.
 */
@RestController
@RequestMapping("/api")
public class AiController {

    private final AiService ai;

    public AiController(AiService ai) {
        this.ai = ai;
    }

    @GetMapping("/ai/status")
    public ApiResponse<Dto.AiStatus> status() {
        return ApiResponse.ok(ai.status());
    }

    /** The models this server can answer with right now (the Arena lets people compare them). */
    @GetMapping("/ai/models")
    public ApiResponse<java.util.List<Dto.AiModel>> models() {
        return ApiResponse.ok(ai.models());
    }

    @PostMapping("/tasks/{taskId}/ai/review-assist")
    @PreAuthorize("@projectAccess.canAccessTask(#taskId)")
    public ApiResponse<Dto.AiReviewAssist> reviewAssist(@PathVariable Long taskId) {
        return ApiResponse.ok(ai.reviewAssist(taskId), "Draft notes ready. Check them before using.");
    }

    @PostMapping("/tasks/{taskId}/ai/criteria")
    @PreAuthorize("@projectAccess.canAccessTask(#taskId)")
    public ApiResponse<Dto.AiCriteriaSuggestion> criteria(@PathVariable Long taskId) {
        return ApiResponse.ok(ai.suggestCriteria(taskId));
    }

    @PostMapping("/projects/{projectId}/ai/summary")
    @PreAuthorize("@projectAccess.isMember(#projectId)")
    public ApiResponse<Dto.AiSummary> summary(@PathVariable Long projectId) {
        return ApiResponse.ok(ai.projectSummary(projectId));
    }

    /** Flurry's "Plan a project": draft tasks from a brief, for anyone who may create tasks. Nothing is created here. */
    @PostMapping("/projects/{projectId}/ai/plan")
    @PreAuthorize("@projectAccess.isMember(#projectId)")
    public ApiResponse<Dto.AiPlan> plan(@PathVariable Long projectId, @Valid @RequestBody Requests.AiPlan request) {
        return ApiResponse.ok(ai.planProject(projectId, request));
    }

    /** "Ask about this project": answers from the project's records, for any member. */
    @PostMapping("/projects/{projectId}/ai/ask")
    @PreAuthorize("@projectAccess.isMember(#projectId)")
    public ApiResponse<Dto.AiAnswer> ask(@PathVariable Long projectId, @Valid @RequestBody Requests.AiAsk request) {
        return ApiResponse.ok(ai.askProject(projectId, request));
    }
}
