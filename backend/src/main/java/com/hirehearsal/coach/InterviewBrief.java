package com.hirehearsal.coach;

import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Track;

/** Everything the coach needs to know about an interview in order to ask and evaluate questions. */
public record InterviewBrief(
        Track track,
        Persona persona,
        String role,
        String topic,
        String projectName,
        String projectSummary,
        String jobDescription,
        int questionCount) {

    public boolean hasRole() {
        return !Text.isBlank(role);
    }

    public boolean hasTopic() {
        return !Text.isBlank(topic);
    }

    public boolean hasProject() {
        return !Text.isBlank(projectName);
    }

    public boolean hasJobDescription() {
        return !Text.isBlank(jobDescription);
    }
}
