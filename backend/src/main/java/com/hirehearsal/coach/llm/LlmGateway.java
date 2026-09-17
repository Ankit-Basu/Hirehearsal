package com.hirehearsal.coach.llm;

import java.util.List;
import java.util.Optional;

/** A chat-completion model that answers with a JSON object. */
public interface LlmGateway {

    /** Whether at least one API key is configured. */
    boolean enabled();

    /** Returns the raw message content, or empty when every attempt failed (callers fall back to heuristics). */
    Optional<String> complete(List<ChatMessage> messages, int maxTokens);

    String model();

    int keysConfigured();

    int keysAvailable();
}
