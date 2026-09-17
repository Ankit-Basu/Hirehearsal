package com.hirehearsal.interview;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.hirehearsal.web.JsonEnums;

public enum InterviewStatus {
    /** Questions are still being asked. */
    IN_PROGRESS,
    /** Every question is answered; waiting for the candidate's post-interview reflection. */
    AWAITING_REFLECTION,
    /** Reflection saved (or the candidate ended early). */
    FINISHED;

    @JsonValue
    public String json() {
        return JsonEnums.toJson(this);
    }

    @JsonCreator
    public static InterviewStatus fromJson(String value) {
        return JsonEnums.fromJson(InterviewStatus.class, value);
    }
}
