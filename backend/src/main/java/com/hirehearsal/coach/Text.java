package com.hirehearsal.coach;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Deterministic text helpers. The TypeScript offline engine ({@code src/lib/engine/text.ts}) mirrors these
 * exactly so a guest interview is scored the same way in the browser as on the server.
 */
public final class Text {

    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9%+#]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private Text() {
    }

    /** Lowercases, drops apostrophes, collapses everything else to single spaces and pads both ends. */
    public static String normalize(String raw) {
        if (raw == null) {
            return " ";
        }
        String lowered = raw.toLowerCase(Locale.ROOT).replace("'", "").replace("’", "");
        String collapsed = NON_WORD.matcher(lowered).replaceAll(" ").trim();
        return collapsed.isEmpty() ? " " : " " + collapsed + " ";
    }

    public static List<String> tokens(String raw) {
        String normalized = normalize(raw).trim();
        if (normalized.isEmpty()) {
            return List.of();
        }
        return List.of(normalized.split(" "));
    }

    /** Counts whole-phrase occurrences inside already-normalized text. */
    public static int countPhrase(String normalized, String phrase) {
        String needle = " " + phrase + " ";
        int count = 0;
        int index = normalized.indexOf(needle);
        while (index >= 0) {
            count++;
            index = normalized.indexOf(needle, index + needle.length() - 1);
        }
        return count;
    }

    public static int countPhrases(String normalized, List<String> phrases) {
        int total = 0;
        for (String phrase : phrases) {
            total += countPhrase(normalized, phrase);
        }
        return total;
    }

    public static boolean containsAnyPhrase(String normalized, List<String> phrases) {
        for (String phrase : phrases) {
            if (normalized.contains(" " + phrase + " ")) {
                return true;
            }
        }
        return false;
    }

    /** A keyword ending in {@code *} matches any word that starts with it; otherwise it must match whole words. */
    public static boolean matchesKeyword(String normalized, String keyword) {
        if (keyword.endsWith("*")) {
            return normalized.contains(" " + keyword.substring(0, keyword.length() - 1));
        }
        return normalized.contains(" " + keyword + " ");
    }

    /** Java's String#hashCode; reproduced in TypeScript so question rotation is consistent. */
    public static int hash(String value) {
        return value == null ? 0 : value.hashCode();
    }

    public static String fill(String template, Map<String, String> values) {
        String result = template;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            result = result.replace("{" + entry.getKey() + "}", entry.getValue());
        }
        return result;
    }

    /** Trims and collapses whitespace; returns null for blank input. */
    public static String clean(String value) {
        if (value == null) {
            return null;
        }
        String collapsed = WHITESPACE.matcher(value).replaceAll(" ").trim();
        return collapsed.isEmpty() ? null : collapsed;
    }

    public static String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, Math.max(0, max - 1)).trim() + "…";
    }

    public static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
