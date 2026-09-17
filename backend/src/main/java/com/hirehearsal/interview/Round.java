package com.hirehearsal.interview;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hirehearsal.web.JsonEnums;

/** The type of a single question. A mixed interview combines several rounds. */
public enum Round {
    TECHNICAL("Technical"),
    PROJECT("Project"),
    HR("HR");

    private final String label;

    Round(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** The key used for this round inside the shared question bank. */
    public String bankKey() {
        return JsonEnums.toJson(this);
    }

    @JsonValue
    public String json() {
        return JsonEnums.toJson(this);
    }

    @JsonCreator
    public static Round fromJson(String value) {
        return JsonEnums.fromJson(Round.class, value);
    }
}
