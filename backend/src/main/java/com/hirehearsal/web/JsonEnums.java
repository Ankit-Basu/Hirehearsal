package com.hirehearsal.web;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Helpers for enums that travel over JSON as lowercase snake_case strings (e.g. {@code bar_raiser}).
 */
public final class JsonEnums {

    private JsonEnums() {
    }

    public static String toJson(Enum<?> value) {
        return value.name().toLowerCase(Locale.ROOT);
    }

    public static <E extends Enum<E>> E fromJson(Class<E> type, String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        for (E constant : type.getEnumConstants()) {
            if (constant.name().equals(normalized)) {
                return constant;
            }
        }
        String allowed = Arrays.stream(type.getEnumConstants()).map(JsonEnums::toJson)
                .collect(Collectors.joining(", "));
        throw new IllegalArgumentException("'" + value + "' is not one of: " + allowed);
    }
}
