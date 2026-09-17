package com.hirehearsal.interview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** End-to-end API flows against an in-memory database with the offline coach (no LLM keys in the test profile). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InterviewApiIntegrationTest {

    private static final String GOOD_ANSWER = "Normalization organises tables to remove redundancy because "
            + "duplicated data drifts out of sync. For example, storing a customer's address in every order row "
            + "means one change must touch many rows, so we split customers into their own table.";

    @Autowired
    private MockMvc mvc;

    @Test
    void guestCanCompleteAnInterviewAndReadTheScorecard() throws Exception {
        String id = start(null, """
                {"track": "technical", "persona": "mentor", "topic": "DBMS", "questionCount": 3, "preConfidence": 4}
                """);

        for (int index = 1; index <= 3; index++) {
            boolean last = index == 3;
            mvc.perform(json(post("/api/interviews/{id}/answers", id), null, """
                            {"index": %d, "answer": "%s", "metrics": {"durationSeconds": 60, "speakingSeconds": 40, "inputMode": "voice"}}
                            """.formatted(index, GOOD_ANSWER)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluation.index").value(index))
                    .andExpect(jsonPath("$.evaluation.evaluatedBy").value("heuristic"))
                    .andExpect(jsonPath("$.completed").value(last))
                    .andExpect(last ? jsonPath("$.next").doesNotExist() : jsonPath("$.next.index").value(index + 1));
        }

        mvc.perform(get("/api/interviews/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("awaiting_reflection"))
                .andExpect(jsonPath("$.answeredCount").value(3));

        mvc.perform(json(post("/api/interviews/{id}/finish", id), null,
                        "{\"postConfidence\": 7, \"reflection\": \"Lead with the definition.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("finished"))
                .andExpect(jsonPath("$.confidenceDelta").value(3))
                .andExpect(jsonPath("$.overallScore", notNullValue()))
                .andExpect(jsonPath("$.speech.avgWpm", notNullValue()))
                .andExpect(jsonPath("$.highlights", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.turns", hasSize(3)))
                .andExpect(jsonPath("$.turns[0].outline", hasSize(greaterThanOrEqualTo(2))));
    }

    @Test
    void rejectsInvalidRequestsWithProblemDetails() throws Exception {
        mvc.perform(json(post("/api/interviews"), null,
                        "{\"track\": \"technical\", \"persona\": \"mentor\", \"questionCount\": 3, \"preConfidence\": 42}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.errors.preConfidence", notNullValue()));

        mvc.perform(json(post("/api/interviews"), null,
                        "{\"track\": \"technical\", \"persona\": \"mentor\", \"questionCount\": 3, \"preConfidence\": 5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Add a technical focus or paste a job description."));
    }

    @Test
    void answeringTheWrongQuestionIsAConflict() throws Exception {
        String id = start(null, """
                {"track": "hr", "persona": "panelist", "role": "SDE Intern", "questionCount": 3, "preConfidence": 5}
                """);

        mvc.perform(json(post("/api/interviews/{id}/answers", id), null, "{\"index\": 2, \"answer\": \"Hello\"}"))
                .andExpect(status().isConflict());

        mvc.perform(json(post("/api/interviews/{id}/hint", id), null, "{\"index\": 1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hint", notNullValue()));

        mvc.perform(get("/api/interviews/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void signedInCandidateGetsHistoryProgressAndPrivateInterviews() throws Exception {
        String token = register("Asha");
        String guestId = start(null, """
                {"track": "project", "persona": "bar_raiser", "projectName": "Hirehearsal", "questionCount": 3, "preConfidence": 6}
                """);

        String id = start(token, """
                {"track": "mixed", "persona": "panelist", "role": "Backend Intern", "topic": "Java",
                 "projectName": "Hirehearsal", "questionCount": 5, "preConfidence": 5}
                """);
        mvc.perform(json(post("/api/interviews/{id}/answers", id), token,
                        "{\"index\": 1, \"answer\": \"" + GOOD_ANSWER + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.next.round").value("technical"));

        // Another account cannot continue this interview.
        String intruder = register("Ravi");
        mvc.perform(json(post("/api/interviews/{id}/answers", id), intruder, "{\"index\": 2, \"answer\": \"Hi\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(json(post("/api/me/claim"), token, "{\"interviewIds\": [\"" + guestId + "\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimed").value(1));

        mvc.perform(get("/api/me/interviews").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2));

        mvc.perform(get("/api/me/progress").param("tz", "Asia/Kolkata").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readiness", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.streakDays").value(1))
                .andExpect(jsonPath("$.practicedToday").value(true))
                .andExpect(jsonPath("$.weekly.goal").value(3));
    }

    @Test
    void accountEndpointsRequireAToken() throws Exception {
        mvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Type", "application/problem+json"));

        mvc.perform(json(post("/api/auth/login"), null,
                        "{\"email\": \"nobody@example.com\", \"password\": \"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Incorrect email or password."));
    }

    @Test
    void statusAndInsightsArePublic() throws Exception {
        start(null, """
                {"track": "technical", "persona": "panelist", "jobDescription": "React and SQL developer", "questionCount": 3, "preConfidence": 5}
                """);

        mvc.perform(get("/api/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.engine").value("offline"))
                .andExpect(jsonPath("$.keysConfigured").value(0));

        mvc.perform(get("/api/insights"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.interviews", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.daily", hasSize(14)))
                .andExpect(jsonPath("$.tracks.technical", greaterThanOrEqualTo(1)));
    }

    private String start(String token, String body) throws Exception {
        String response = mvc.perform(json(post("/api/interviews"), token, body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.question.index").value(1))
                .andExpect(jsonPath("$.opener", notNullValue()))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.id");
        assertThat(id).isNotBlank();
        return id;
    }

    private String register(String name) throws Exception {
        String email = name.toLowerCase() + "-" + UUID.randomUUID() + "@example.com";
        String response = mvc.perform(json(post("/api/auth/register"), null, """
                        {"email": "%s", "password": "correct-horse-battery", "name": "%s"}""".formatted(email, name)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.token");
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String token,
                                                      String body) {
        request.contentType(MediaType.APPLICATION_JSON).content(body);
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        return request;
    }
}
