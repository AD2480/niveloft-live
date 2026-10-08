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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Ollama's own chat API, for a free model running on the same computer as the backend (no key,
 * nothing leaves the machine). The native API is used rather than Ollama's OpenAI-compatible one
 * because it lets us ask for JSON output and a context window big enough for a project's records
 * (Ollama's default is small and it silently cuts longer prompts).
 */
public class OllamaClient implements AiClient {

    /** Chat models that follow instructions and JSON well at laptop sizes, best first. */
    static final List<String> PREFERRED = List.of("llama3.2", "qwen2.5", "llama3.1", "qwen3", "gemma3", "gemma2", "mistral", "phi4", "phi3", "llama3");
    private static final int CONTEXT_TOKENS = 8192;

    private final HttpClient http;
    private final ObjectMapper json;
    private final String baseUrl;
    private final String model;

    public OllamaClient(ObjectMapper json, String baseUrl, String model) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(), json, baseUrl, model);
    }

    /** The same Ollama, answering with another installed model. */
    public OllamaClient withModel(String other) {
        return new OllamaClient(http, json, baseUrl, other);
    }

    OllamaClient(HttpClient http, ObjectMapper json, String baseUrl, String model) {
        this.http = http;
        this.json = json;
        this.baseUrl = root(baseUrl);
        this.model = model;
    }

    public String model() {
        return model;
    }

    public String baseUrl() {
        return baseUrl;
    }

    @Override
    public Completion complete(String system, String user, int maxTokens) {
        try {
            ObjectNode body = json.createObjectNode();
            body.put("model", model);
            body.put("stream", false);
            body.put("format", "json");
            ObjectNode options = body.putObject("options");
            options.put("temperature", 0.2);
            options.put("num_ctx", CONTEXT_TOKENS);
            options.put("num_predict", maxTokens);
            ArrayNode messages = body.putArray("messages");
            messages.addObject().put("role", "system").put("content", system);
            messages.addObject().put("role", "user").put("content", user);
            HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + "/api/chat"))
                    // A laptop may need a while, especially the first time a model is loaded.
                    .timeout(Duration.ofSeconds(180))
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) throw new AiClientException("Ollama returned HTTP " + res.statusCode(), null);
            JsonNode root = json.readTree(res.body());
            JsonNode content = root.path("message").path("content");
            String text = content.isTextual() ? content.asText() : "";
            if (text.isBlank()) throw new AiClientException("Ollama returned no text", null);
            return Completion.of(text, root.path("prompt_eval_count").asLong(0) + root.path("eval_count").asLong(0), system, user);
        } catch (AiClientException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiClientException("AI request was interrupted", e);
        } catch (Exception e) {
            throw new AiClientException("AI request failed: " + e.getClass().getSimpleName(), e);
        }
    }

    // ------------------------------------------------------------------ detection

    /**
     * What a look for Ollama found: a client to use (or why there isn't one), and every chat model
     * installed there (the Arena can ask any of them).
     */
    public record Detection(OllamaClient client, String reason, List<String> models) {
        public Detection(OllamaClient client, String reason) {
            this(client, reason, List.of());
        }
    }

    /**
     * Looks for Ollama at each address in turn and picks a chat model: {@code preferredModel} when
     * it's installed, otherwise the best one from {@link #PREFERRED}, otherwise any installed model
     * that isn't an embedding model.
     */
    static Detection detect(HttpClient http, ObjectMapper json, List<String> bases, String preferredModel) {
        String reason = "Ollama isn’t running on the computer that runs the backend.";
        for (String base : bases) {
            if (base == null || base.isBlank()) continue;
            String root = root(base);
            List<String> models;
            try {
                HttpRequest req = HttpRequest.newBuilder(URI.create(root + "/api/tags")).timeout(Duration.ofMillis(1500)).GET().build();
                HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
                if (res.statusCode() / 100 != 2) continue;
                models = new ArrayList<>();
                for (JsonNode m : json.readTree(res.body()).path("models")) {
                    String name = m.path("name").asText(m.path("model").asText("")).trim();
                    if (!name.isEmpty()) models.add(name);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return new Detection(null, reason);
            } catch (Exception e) {
                continue; // not there (connection refused, unknown host, timeout, not JSON)
            }
            String chosen = pick(models, preferredModel);
            if (chosen != null) {
                List<String> chat = models.stream().filter(n -> !n.toLowerCase(Locale.ROOT).contains("embed")).toList();
                return new Detection(new OllamaClient(http, json, root, chosen), null, chat);
            }
            reason = models.isEmpty()
                    ? "Ollama is running but has no models yet. Run: ollama pull llama3.2"
                    : "Ollama is running, but model “" + preferredModel + "” isn’t installed. Run: ollama pull " + preferredModel;
            // Keep looking: another address may have a usable model.
        }
        return new Detection(null, reason);
    }

    /** The model to use from what's installed, or null. */
    static String pick(List<String> installed, String preferredModel) {
        List<String> chat = installed.stream().filter(n -> !n.toLowerCase(Locale.ROOT).contains("embed")).toList();
        if (preferredModel != null && !preferredModel.isBlank()) {
            String want = preferredModel.trim().toLowerCase(Locale.ROOT);
            for (String n : installed) {
                String name = n.toLowerCase(Locale.ROOT);
                if (name.equals(want) || name.equals(want + ":latest")) return n;
            }
            return null; // asked for one that isn't installed: say so rather than silently use another
        }
        for (String family : PREFERRED) {
            for (String n : chat) {
                String name = n.toLowerCase(Locale.ROOT);
                if (name.equals(family) || name.startsWith(family + ":")) return n;
            }
        }
        return chat.isEmpty() ? null : chat.get(0);
    }

    /** "http://localhost:11434/v1/" → "http://localhost:11434" (Ollama's own API lives at the root). */
    static String root(String base) {
        String b = base.trim();
        while (b.endsWith("/")) b = b.substring(0, b.length() - 1);
        if (b.endsWith("/v1")) b = b.substring(0, b.length() - 3);
        return b;
    }
}
