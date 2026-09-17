package com.hirehearsal.coach;

import com.hirehearsal.coach.CoachTypes.LlmEvaluation;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Validates LLM replies. Anything malformed or out of range is rejected so the heuristic coach can take over. */
@Component
public class LlmReplyParser {

    private final ObjectMapper mapper;

    public LlmReplyParser(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** Models sometimes echo labels like "Question 2 of 5 (Technical):" in front of the question. */
    private static final Pattern QUESTION_LABEL = Pattern.compile(
            "^\\s*(?:q(?:uestion)?\\s*\\d+(?:\\s*(?:of|/)\\s*\\d+)?\\s*(?:\\([^)]*\\))?\\s*[:.\\-–—]\\s*)",
            Pattern.CASE_INSENSITIVE);

    public Optional<String> question(String raw) {
        return parseObject(raw).map(node -> stripLabel(text(node, "question", 400)));
    }

    static String stripLabel(String question) {
        if (question == null) {
            return null;
        }
        String stripped = QUESTION_LABEL.matcher(question).replaceFirst("").trim();
        return stripped.isEmpty() ? null : stripped;
    }

    public Optional<String> hint(String raw) {
        return parseObject(raw).map(node -> text(node, "hint", 300));
    }

    public Optional<LlmEvaluation> evaluation(String raw) {
        Optional<JsonNode> parsed = parseObject(raw);
        if (parsed.isEmpty()) {
            return Optional.empty();
        }
        JsonNode node = parsed.get();
        JsonNode rubric = node.path("rubric");
        Integer score = score(node.get("score"));
        Integer substance = score(rubric.get("substance"));
        Integer clarity = score(rubric.get("clarity"));
        Integer depth = score(rubric.get("depth"));
        String feedback = text(node, "feedback", 300);
        if (score == null || substance == null || clarity == null || depth == null || feedback == null) {
            return Optional.empty();
        }
        return Optional.of(new LlmEvaluation(score, substance, clarity, depth, feedback,
                text(node, "tip", 300), strings(node.get("outline"), 4, 160),
                stripLabel(text(node, "nextQuestion", 400))));
    }

    Optional<JsonNode> parseObject(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return Optional.empty();
        }
        try {
            JsonNode node = mapper.readTree(raw.substring(start, end + 1));
            return node != null && node.isObject() ? Optional.of(node) : Optional.empty();
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
    }

    private static Integer score(JsonNode node) {
        if (node == null) {
            return null;
        }
        double value;
        if (node.isNumber()) {
            value = node.asDouble();
        } else if (node.isString()) {
            try {
                value = Double.parseDouble(node.asString().trim());
            } catch (NumberFormatException ex) {
                return null;
            }
        } else {
            return null;
        }
        if (Double.isNaN(value)) {
            return null;
        }
        return (int) Math.max(0, Math.min(10, Math.round(value)));
    }

    private static String text(JsonNode node, String field, int max) {
        JsonNode value = node.get(field);
        if (value == null || !value.isString()) {
            return null;
        }
        String cleaned = Text.clean(value.asString());
        return cleaned == null ? null : Text.truncate(cleaned, max);
    }

    private static List<String> strings(JsonNode node, int maxItems, int maxLength) {
        List<String> items = new ArrayList<>();
        if (node == null || !node.isArray()) {
            return items;
        }
        for (JsonNode element : node) {
            if (items.size() == maxItems) {
                break;
            }
            if (element.isString()) {
                String cleaned = Text.clean(element.asString());
                if (cleaned != null) {
                    items.add(Text.truncate(cleaned, maxLength));
                }
            }
        }
        return List.copyOf(items);
    }
}
