package dev.projectflow.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Client for any service that speaks the OpenAI "chat completions" API. That covers free options:
 * Ollama on your own computer (no key, e.g. http://localhost:11434/v1), and the free tiers of
 * Groq and Google Gemini, as well as OpenRouter, LM Studio and OpenAI itself. The key (if any)
 * stays on the server.
 */
public class OpenAiCompatibleClient implements AiClient {

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper json;
    private final String baseUrl;
    private final String apiKey;
    private final String model;

    public OpenAiCompatibleClient(ObjectMapper json, String baseUrl, String apiKey, String model) {
        this.json = json;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
    }

    @Override
    public Completion complete(String system, String user, int maxTokens) {
        try {
            ObjectNode body = json.createObjectNode();
            body.put("model", model);
            body.put("max_tokens", maxTokens);
            body.put("temperature", 0.2);
            ArrayNode messages = body.putArray("messages");
            messages.addObject().put("role", "system").put("content", system);
            messages.addObject().put("role", "user").put("content", user);
            HttpRequest.Builder req = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                    // Local models on a laptop can be slow to answer.
                    .timeout(Duration.ofSeconds(120))
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
            if (!apiKey.isEmpty()) req.header("authorization", "Bearer " + apiKey);
            HttpResponse<String> res = http.send(req.build(), HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new AiClientException("AI provider returned HTTP " + res.statusCode(), null);
            }
            JsonNode root = json.readTree(res.body());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            String text = content.isTextual() ? content.asText() : "";
            if (text.isBlank()) throw new AiClientException("AI provider returned no text", null);
            return Completion.of(text, root.path("usage").path("total_tokens").asLong(0), system, user);
        } catch (AiClientException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiClientException("AI request was interrupted", e);
        } catch (Exception e) {
            throw new AiClientException("AI request failed: " + e.getClass().getSimpleName(), e);
        }
    }
}
