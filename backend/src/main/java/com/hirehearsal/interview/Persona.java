package com.hirehearsal.interview;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hirehearsal.web.JsonEnums;

/**
 * The interviewer's temperament. It shapes tone, starting difficulty, how fast difficulty adapts, and scoring
 * leniency.
 */
public enum Persona {
    MENTOR(0.5, 9, 5),
    PANELIST(0.0, 8, 4),
    BAR_RAISER(-0.8, 7, 3);

    private final double leniency;
    private final int levelUpAt;
    private final int levelDownAt;

    Persona(double leniency, int levelUpAt, int levelDownAt) {
        this.leniency = leniency;
        this.levelUpAt = levelUpAt;
        this.levelDownAt = levelDownAt;
    }

    public double leniency() {
        return leniency;
    }

    public int levelUpAt() {
        return levelUpAt;
    }

    public int levelDownAt() {
        return levelDownAt;
    }

    public String bankKey() {
        return JsonEnums.toJson(this);
    }

    @JsonValue
    public String json() {
        return JsonEnums.toJson(this);
    }

    @JsonCreator
    public static Persona fromJson(String value) {
        return JsonEnums.fromJson(Persona.class, value);
    }
}
