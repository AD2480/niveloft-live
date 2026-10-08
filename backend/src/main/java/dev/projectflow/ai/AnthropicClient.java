package dev.projectflow.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/** Minimal client for Anthropic's Messages API using the JDK HTTP client (no extra dependency). */
public class AnthropicClient implements AiClient {

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper json;
    private final String baseUrl;
    private final String apiKey;
    private final String model;

    public AnthropicClient(ObjectMapper json, String baseUrl, String apiKey, String model) {
        this.json = json;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public Completion complete(String system, String user, int maxTokens) {
        try {
            ObjectNode body = json.createObjectNode();
            body.put("model", model);
            body.put("max_tokens", maxTokens);
            body.put("system", system);
            ObjectNode message = body.putArray("messages").addObject();
            message.put("role", "user");
            message.put("content", user);
            HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + "/v1/messages"))
                    .timeout(Duration.ofSeconds(60))
                    .header("content-type", "application/json")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new AiClientException("AI provider returned HTTP " + res.statusCode(), null);
            }
            JsonNode root = json.readTree(res.body());
            JsonNode content = root.path("content");
            StringBuilder text = new StringBuilder();
            for (JsonNode part : content) {
                if ("text".equals(part.path("type").asText())) text.append(part.path("text").asText());
            }
            if (text.isEmpty()) throw new AiClientException("AI provider returned no text", null);
            JsonNode usage = root.path("usage");
            return Completion.of(text.toString(), usage.path("input_tokens").asLong(0) + usage.path("output_tokens").asLong(0), system, user);
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
