package com.hirehearsal.interview;

import com.hirehearsal.coach.CoachService;
import com.hirehearsal.coach.CoachTypes.Evaluation;
import com.hirehearsal.coach.CoachTypes.EvaluationInput;
import com.hirehearsal.coach.CoachTypes.HintResult;
import com.hirehearsal.coach.CoachTypes.NextPlan;
import com.hirehearsal.coach.CoachTypes.QuestionDraft;
import com.hirehearsal.coach.CoachTypes.TurnOutcome;
import com.hirehearsal.coach.InterviewBrief;
import com.hirehearsal.coach.QuestionBank;
import com.hirehearsal.coach.Text;
import com.hirehearsal.interview.dto.InterviewRequests.AnswerSubmission;
import com.hirehearsal.interview.dto.InterviewRequests.DrillQuestion;
import com.hirehearsal.interview.dto.InterviewRequests.FinishRequest;
import com.hirehearsal.interview.dto.InterviewRequests.HintRequest;
import com.hirehearsal.interview.dto.InterviewRequests.SpeechMetrics;
import com.hirehearsal.interview.dto.InterviewRequests.StartInterviewRequest;
import com.hirehearsal.interview.dto.InterviewResponses.AnswerResultResponse;
import com.hirehearsal.interview.dto.InterviewResponses.HintResponse;
import com.hirehearsal.interview.dto.InterviewResponses.InterviewStartedResponse;
import com.hirehearsal.interview.dto.InterviewResponses.InterviewSummary;
import com.hirehearsal.interview.dto.InterviewResponses.PageView;
import com.hirehearsal.interview.dto.InterviewResponses.QuestionView;
import com.hirehearsal.interview.dto.InterviewResponses.ScorecardResponse;
import com.hirehearsal.user.AppUser;
import com.hirehearsal.user.AppUserRepository;
import com.hirehearsal.web.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Runs interviews. Every operation reads a snapshot in one short transaction, calls the (possibly slow) coach with
 * no transaction open, then writes in a second transaction guarded by the entity's optimistic-lock version.
 */
@Service
public class InterviewService {

    private static final Logger log = LoggerFactory.getLogger(InterviewService.class);

    private final InterviewRepository interviews;
    private final AppUserRepository users;
    private final CoachService coach;
    private final QuestionBank bank;
    private final ScorecardAssembler assembler;
    private final TransactionTemplate tx;

    public InterviewService(InterviewRepository interviews, AppUserRepository users, CoachService coach,
                            QuestionBank bank, ScorecardAssembler assembler, TransactionTemplate tx) {
        this.interviews = interviews;
        this.users = users;
        this.coach = coach;
        this.bank = bank;
        this.assembler = assembler;
        this.tx = tx;
    }

    public InterviewStartedResponse start(StartInterviewRequest request, String userId) {
        List<DrillQuestion> drillQuestions = request.questions() == null ? List.of() : request.questions();
        boolean drill = !drillQuestions.isEmpty();
        int questionCount = drill ? drillQuestions.size() : request.questionCount();
        if (!drill && (questionCount < 3 || questionCount > 8)) {
            throw ApiException.badRequest("An interview needs between 3 and 8 questions.");
        }

        InterviewBrief brief = new InterviewBrief(request.track(), request.persona(), Text.clean(request.role()),
                Text.clean(request.topic()), Text.clean(request.projectName()), trimToNull(request.projectSummary()),
                trimToNull(request.jobDescription()), questionCount);
        if (!drill) {
            validateBrief(brief);
        }

        List<Round> plan = drill
                ? drillQuestions.stream()
                        .map(q -> q.round() != null ? q.round() : RoundPlanner.defaultRound(request.track()))
                        .toList()
                : RoundPlanner.plan(request.track(), questionCount, brief.hasProject());

        String id = UUID.randomUUID().toString();
        int seed = seed(id);
        Round firstRound = plan.get(0);
        Tier tier = coach.startTier(request.persona(), firstRound);
        QuestionDraft first = drill
                ? new QuestionDraft(Text.clean(drillQuestions.get(0).question()), tier, "custom")
                : coach.firstQuestion(brief, firstRound, tier, seed);
        String opener = coach.opener(brief);
        String engine = coach.engine();
        String headline = headline(brief, drill);

        Interview saved = tx.execute(status -> {
            Interview interview = new Interview();
            interview.setId(id);
            if (userId != null) {
                interview.setOwner(users.findById(userId).orElse(null));
            }
            interview.setTrack(brief.track());
            interview.setPersona(brief.persona());
            interview.setStatus(InterviewStatus.IN_PROGRESS);
            interview.setRole(brief.role());
            interview.setTopic(brief.topic());
            interview.setProjectName(brief.projectName());
            interview.setProjectSummary(Text.truncate(brief.projectSummary(), 1500));
            interview.setJobDescription(Text.truncate(brief.jobDescription(), 4000));
            interview.setHeadline(headline);
            interview.setRoundPlan(String.join(",", plan.stream().map(Round::name).toList()));
            interview.setDrill(drill);
            if (drill) {
                interview.setDrillQuestions(String.join("\n",
                        drillQuestions.stream().map(q -> Text.clean(q.question())).toList()));
                interview.setSourceInterviewId(Text.clean(request.sourceInterviewId()));
            }
            interview.setQuestionCount(questionCount);
            interview.setPreConfidence(request.preConfidence());
            interview.setEngine(engine);
            interview.addTurn(newTurn(1, firstRound, first));
            return interviews.save(interview);
        });

        log.info("Interview {} started: track={}, persona={}, questions={}, drill={}, engine={}", id,
                brief.track().json(), brief.persona().json(), questionCount, drill, engine);
        return new InterviewStartedResponse(saved.getId(), saved.getTrack(), saved.getPersona(), saved.getHeadline(),
                questionCount, saved.getPreConfidence(), drill, engine, opener,
                new QuestionView(1, firstRound, first.question()), saved.getCreatedAt());
    }

    public AnswerResultResponse submitAnswer(String id, AnswerSubmission request, String userId) {
        record Snapshot(Long version, InterviewBrief brief, EvaluationInput input) {
        }

        Snapshot snapshot = tx.execute(status -> {
            Interview interview = load(id);
            assertCanWrite(interview, userId);
            InterviewTurn turn = openTurn(interview, request.index());
            List<String> asked = interview.getTurns().stream().map(InterviewTurn::getQuestion).toList();

            NextPlan next = null;
            if (turn.getTurnIndex() < interview.getQuestionCount()) {
                int nextIndex = turn.getTurnIndex() + 1;
                String fixed = interview.isDrill() ? interview.drillQuestionList().get(nextIndex - 1) : null;
                next = new NextPlan(nextIndex, interview.rounds().get(nextIndex - 1), fixed);
            }
            boolean skipped = request.passed() || Text.tokens(request.answer()).isEmpty();
            EvaluationInput input = new EvaluationInput(turn.getTurnIndex(), turn.getRound(), turn.getTier(),
                    turn.getQuestion(), request.answer(), skipped, turn.isHintUsed(), asked, next);
            return new Snapshot(interview.getVersion(), brief(interview), input);
        });

        TurnOutcome outcome = coach.evaluate(snapshot.brief(), snapshot.input(), seed(id));

        return tx.execute(status -> {
            Interview interview = load(id);
            if (!Objects.equals(interview.getVersion(), snapshot.version())) {
                throw ApiException.conflict(
                        "This interview changed while your answer was being evaluated. Refresh and try again.");
            }
            InterviewTurn turn = openTurn(interview, request.index());
            Evaluation evaluation = outcome.evaluation();
            boolean skipped = snapshot.input().skipped();

            turn.setAnswered(true);
            turn.setSkipped(skipped);
            turn.setAnswer(skipped ? null : Text.truncate(request.answer().trim(), 6000));
            turn.setAnsweredAt(Instant.now());
            turn.setScore(evaluation.score());
            turn.setSubstance(evaluation.substance());
            turn.setClarity(evaluation.clarity());
            turn.setDepth(evaluation.depth());
            turn.setFeedback(Text.truncate(evaluation.feedback(), 400));
            turn.setTip(Text.truncate(evaluation.tip(), 400));
            turn.setOutline(Text.truncate(String.join("\n", evaluation.outline()), 1200));
            turn.setEvaluatedBy(evaluation.evaluatedBy());
            turn.setWordCount(evaluation.wordCount());
            turn.setFillerCount(evaluation.fillerCount());
            SpeechMetrics metrics = request.metrics();
            turn.setDurationSeconds(metrics == null ? null : metrics.durationSeconds());
            turn.setSpeakingSeconds(metrics == null ? null : metrics.speakingSeconds());
            turn.setInputMode(metrics == null || metrics.inputMode() == null ? "text" : metrics.inputMode());

            interview.setAnsweredCount(interview.getAnsweredCount() + 1);
            QuestionView next = null;
            if (outcome.next() != null) {
                int nextIndex = turn.getTurnIndex() + 1;
                Round nextRound = interview.rounds().get(nextIndex - 1);
                interview.addTurn(newTurn(nextIndex, nextRound, outcome.next()));
                next = new QuestionView(nextIndex, nextRound, outcome.next().question());
            } else {
                interview.setStatus(InterviewStatus.AWAITING_REFLECTION);
            }
            interview.setOverallScore(ScorecardAssembler.overallScore(interview.getTurns()));
            interviews.saveAndFlush(interview);

            return new AnswerResultResponse(assembler.evaluationView(turn), next, next == null, coach.engine());
        });
    }

    public HintResponse hint(String id, HintRequest request, String userId) {
        record Snapshot(InterviewBrief brief, Round round, String question, String existingHint) {
        }

        Snapshot snapshot = tx.execute(status -> {
            Interview interview = load(id);
            assertCanWrite(interview, userId);
            InterviewTurn turn = openTurn(interview, request.index());
            return new Snapshot(brief(interview), turn.getRound(), turn.getQuestion(), turn.getHint());
        });
        if (snapshot.existingHint() != null) {
            return new HintResponse(request.index(), snapshot.existingHint(), "saved");
        }

        HintResult hint = coach.hint(snapshot.brief(), snapshot.round(), snapshot.question());

        return tx.execute(status -> {
            Interview interview = load(id);
            InterviewTurn turn = openTurn(interview, request.index());
            if (turn.getHint() == null) {
                turn.setHint(Text.truncate(hint.hint(), 400));
                turn.setHintUsed(true);
                interview.touch();
                interviews.saveAndFlush(interview);
            }
            return new HintResponse(request.index(), turn.getHint(), hint.source());
        });
    }

    public ScorecardResponse finish(String id, FinishRequest request, String userId) {
        return tx.execute(status -> {
            Interview interview = load(id);
            assertCanWrite(interview, userId);
            if (interview.getStatus() == InterviewStatus.IN_PROGRESS) {
                interview.setEndedEarly(true);
            }
            interview.setStatus(InterviewStatus.FINISHED);
            interview.setPostConfidence(request.postConfidence());
            interview.setReflection(Text.truncate(trimToNull(request.reflection()), 600));
            if (interview.getFinishedAt() == null) {
                interview.setFinishedAt(Instant.now());
            }
            interviews.saveAndFlush(interview);
            return assembler.scorecard(interview);
        });
    }

    public ScorecardResponse scorecard(String id) {
        return tx.execute(status -> assembler.scorecard(load(id)));
    }

    public PageView<InterviewSummary> listForUser(String userId, int page, int size) {
        return tx.execute(status -> {
            Page<Interview> result = interviews.findByOwnerIdOrderByCreatedAtDesc(userId,
                    PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size))));
            return new PageView<>(result.getContent().stream().map(assembler::summary).toList(),
                    result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
        });
    }

    /** Attaches guest interviews (created before signing in) to the user's account. */
    public int claim(String userId, List<String> interviewIds) {
        if (interviewIds == null || interviewIds.isEmpty()) {
            return 0;
        }
        Integer claimed = tx.execute(status -> {
            AppUser user = users.findById(userId)
                    .orElseThrow(() -> ApiException.unauthorized("Your session has expired. Sign in again."));
            List<Interview> guestInterviews = interviews.findByIdInAndOwnerIsNull(interviewIds);
            guestInterviews.forEach(interview -> interview.setOwner(user));
            return guestInterviews.size();
        });
        return claimed == null ? 0 : claimed;
    }

    private void validateBrief(InterviewBrief brief) {
        switch (brief.track()) {
            case TECHNICAL, MIXED -> {
                if (!brief.hasTopic() && !brief.hasJobDescription()) {
                    throw ApiException.badRequest("Add a technical focus or paste a job description.");
                }
            }
            case PROJECT -> {
                if (!brief.hasProject()) {
                    throw ApiException.badRequest("Tell us the name of the project you want to defend.");
                }
            }
            case HR -> {
                // Role is optional; questions default to a software engineering role.
            }
        }
    }

    private String headline(InterviewBrief brief, boolean drill) {
        String base = switch (brief.track()) {
            case TECHNICAL -> brief.hasTopic() ? brief.topic() : "Technical · " + bank.topicLabel(brief);
            case PROJECT -> brief.hasProject() ? brief.projectName() : "Project deep-dive";
            case HR -> (brief.hasRole() ? brief.role() + " · " : "") + "HR round";
            case MIXED -> (brief.hasRole() ? brief.role() : "Full interview loop")
                    + " · " + bank.topicLabel(brief);
        };
        return Text.truncate(drill ? "Retry drill · " + base : base, 160);
    }

    private Interview load(String id) {
        return interviews.findWithTurns(id).orElseThrow(() -> ApiException.notFound("Interview not found."));
    }

    private static InterviewTurn openTurn(Interview interview, int index) {
        if (interview.getStatus() != InterviewStatus.IN_PROGRESS) {
            throw ApiException.conflict("This interview is no longer accepting answers.");
        }
        InterviewTurn turn = interview.currentTurn()
                .orElseThrow(() -> ApiException.conflict("This interview has no open question."));
        if (turn.isAnswered() || turn.getTurnIndex() != index) {
            throw ApiException.conflict("Question " + index + " is not the open question.");
        }
        return turn;
    }

    private static void assertCanWrite(Interview interview, String userId) {
        if (interview.getOwner() != null && !interview.isOwnedBy(userId)) {
            throw ApiException.forbidden("This interview belongs to another account.");
        }
    }

    private static InterviewBrief brief(Interview interview) {
        return new InterviewBrief(interview.getTrack(), interview.getPersona(), interview.getRole(),
                interview.getTopic(), interview.getProjectName(), interview.getProjectSummary(),
                interview.getJobDescription(), interview.getQuestionCount());
    }

    private static InterviewTurn newTurn(int index, Round round, QuestionDraft draft) {
        InterviewTurn turn = new InterviewTurn();
        turn.setTurnIndex(index);
        turn.setRound(round);
        turn.setTier(draft.tier());
        turn.setQuestion(Text.truncate(draft.question(), 600));
        turn.setQuestionSource(draft.source());
        turn.setAskedAt(Instant.now());
        return turn;
    }

    private static int seed(String id) {
        return Math.floorMod(Text.hash(id), 997);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
