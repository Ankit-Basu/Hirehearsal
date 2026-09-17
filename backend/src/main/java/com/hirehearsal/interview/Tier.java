package com.hirehearsal.interview;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hirehearsal.web.JsonEnums;
import java.util.List;

/** Question difficulty. The interview adapts the tier after every answer. */
public enum Tier {
    FOUNDATION,
    CORE,
    STRETCH;

    public Tier up() {
        return this == FOUNDATION ? CORE : STRETCH;
    }

    public Tier down() {
        return this == STRETCH ? CORE : FOUNDATION;
    }

    /** The order in which tiers are tried when the preferred tier has no unused questions left. */
    public List<Tier> searchOrder() {
        return switch (this) {
            case FOUNDATION -> List.of(FOUNDATION, CORE, STRETCH);
            case CORE -> List.of(CORE, STRETCH, FOUNDATION);
            case STRETCH -> List.of(STRETCH, CORE, FOUNDATION);
        };
    }

    public String bankKey() {
        return JsonEnums.toJson(this);
    }

    @JsonValue
    public String json() {
        return JsonEnums.toJson(this);
    }

    @JsonCreator
    public static Tier fromJson(String value) {
        return JsonEnums.fromJson(Tier.class, value);
    }
}
