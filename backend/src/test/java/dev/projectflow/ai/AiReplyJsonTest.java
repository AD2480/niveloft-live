package dev.projectflow.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Small models don't always reply with exactly one JSON object: they wrap it in prose or code
 * fences, repeat it, or add a note with braces after it. The first balanced object is the answer.
 */
class AiReplyJsonTest {

    @Test
    void findsTheFirstBalancedObjectAndIgnoresWhatFollows() {
        String reply = "Sure! ```json\n{\"answer\":\"CCP-2 is late.\",\"citedTasks\":[\"CCP-2\"]}\n``` Note: {see above}";
        List<String> found = AiService.jsonCandidates(reply);
        assertThat(found).first().isEqualTo("{\"answer\":\"CCP-2 is late.\",\"citedTasks\":[\"CCP-2\"]}");
        assertThat(found).hasSize(2);
    }

    @Test
    void ignoresBracesInsideStrings() {
        String reply = "{\"answer\":\"Use {curly} braces and a \\\"quote\\\" }\"} {\"answer\":\"second\"}";
        assertThat(AiService.jsonCandidates(reply)).containsExactly("{\"answer\":\"Use {curly} braces and a \\\"quote\\\" }\"}", "{\"answer\":\"second\"}");
    }

    @Test
    void handlesNestedObjectsAndUnfinishedOnes() {
        assertThat(AiService.jsonCandidates("{\"a\":{\"b\":1}}")).containsExactly("{\"a\":{\"b\":1}}");
        assertThat(AiService.jsonCandidates("{\"answer\":\"cut off")).isEmpty();
        assertThat(AiService.jsonCandidates("Hello! How can I help?")).isEmpty();
    }
}
