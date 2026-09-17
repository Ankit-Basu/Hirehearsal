package com.hirehearsal.coach;

import com.hirehearsal.coach.BankModel.Lexicon;
import com.hirehearsal.coach.CoachTypes.AnswerSignals;
import com.hirehearsal.interview.Round;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Extracts measurable signals from an answer: length, structure, reasoning, fillers and topical overlap. */
@Component
public class AnswerAnalyzer {

    private static final Pattern SENTENCE_END = Pattern.compile("[.!?]");
    private static final Pattern SENTENCE_SPLIT = Pattern.compile("[.!?]+");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern ALL_DIGITS = Pattern.compile("[0-9]+");

    private final Lexicon lexicon;
    private final Set<String> stopwords;

    public AnswerAnalyzer(QuestionBank bank) {
        this.lexicon = bank.model().lexicon();
        this.stopwords = Set.copyOf(lexicon.stopwords());
    }

    public AnswerSignals analyze(String question, String answer, Round round) {
        String raw = answer == null ? "" : answer;
        String normalized = Text.normalize(raw);
        List<String> tokens = Text.tokens(raw);
        int words = tokens.size();

        boolean hasPunctuation = SENTENCE_END.matcher(raw).find();
        int sentences = 0;
        for (String part : SENTENCE_SPLIT.split(raw)) {
            if (Text.tokens(part).size() >= 3) {
                sentences++;
            }
        }
        sentences = Math.max(1, sentences);
        double avgSentenceLength = words / (double) sentences;

        int connectors = Text.countPhrases(normalized, lexicon.connectors());
        int examples = Text.countPhrases(normalized, lexicon.examples());
        int signposts = Text.countPhrases(normalized, lexicon.signposts());
        int fillers = Text.countPhrases(normalized, lexicon.fillers());

        int star = 0;
        if (round == Round.HR) {
            star += Text.containsAnyPhrase(normalized, lexicon.star().situation()) ? 1 : 0;
            star += Text.containsAnyPhrase(normalized, lexicon.star().action()) ? 1 : 0;
            star += Text.containsAnyPhrase(normalized, lexicon.star().result()) ? 1 : 0;
        }

        boolean quantified = DIGIT.matcher(raw).find() || Text.containsAnyPhrase(normalized, lexicon.quantifiers());
        List<String> keywords = keywords(question);
        double overlap = overlap(keywords, tokens);

        return new AnswerSignals(words, hasPunctuation, sentences, avgSentenceLength, connectors, examples,
                signposts, fillers, star, quantified, overlap, keywords);
    }

    /** Distinct, meaningful words from the question, in order of appearance. */
    public List<String> keywords(String question) {
        Set<String> result = new LinkedHashSet<>();
        for (String token : Text.tokens(question)) {
            if (token.length() >= 4 && !stopwords.contains(token) && !ALL_DIGITS.matcher(token).matches()) {
                result.add(token);
            }
        }
        return List.copyOf(result);
    }

    static double overlap(List<String> keywords, List<String> answerTokens) {
        Set<String> stems = new LinkedHashSet<>();
        for (String keyword : keywords) {
            stems.add(stem(keyword));
        }
        if (stems.isEmpty()) {
            return 0.5;
        }
        Set<String> answerStems = new HashSet<>();
        for (String token : answerTokens) {
            if (token.length() >= 4) {
                answerStems.add(stem(token));
            }
        }
        long matched = stems.stream().filter(answerStems::contains).count();
        return matched / (double) stems.size();
    }

    static String stem(String token) {
        return token.length() > 5 ? token.substring(0, 5) : token;
    }
}
