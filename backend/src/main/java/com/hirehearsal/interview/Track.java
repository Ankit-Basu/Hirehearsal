package com.hirehearsal.interview;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hirehearsal.web.JsonEnums;

/** The kind of interview a candidate chooses. */
public enum Track {
    TECHNICAL("Technical round"),
    PROJECT("Project deep-dive"),
    HR("HR & behavioral"),
    MIXED("Full interview loop");

    private final String label;

    Track(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    @JsonValue
    public String json() {
        return JsonEnums.toJson(this);
    }

    @JsonCreator
    public static Track fromJson(String value) {
        return JsonEnums.fromJson(Track.class, value);
    }
}
