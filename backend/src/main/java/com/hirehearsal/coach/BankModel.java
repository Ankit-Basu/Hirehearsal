package com.hirehearsal.coach;

import com.hirehearsal.interview.Tier;
import java.util.List;
import java.util.Map;

/** Typed view of {@code shared/question-bank.json}. */
public final class BankModel {

    private BankModel() {
    }

    public record BankFile(
            int version,
            Technical technical,
            TierSet project,
            TierSet hr,
            Map<String, List<String>> hints,
            Coach coach,
            Lexicon lexicon) {
    }

    public record Technical(List<Topic> topics, TierSet generic) {
    }

    public record Topic(String id, String label, List<String> keywords, TierSet questions) {
    }

    public record TierSet(List<String> foundation, List<String> core, List<String> stretch) {

        public List<String> get(Tier tier) {
            List<String> list = switch (tier) {
                case FOUNDATION -> foundation;
                case CORE -> core;
                case STRETCH -> stretch;
            };
            return list == null ? List.of() : list;
        }
    }

    public record Coach(
            Map<String, String> subjects,
            Map<String, String> openers,
            Map<String, Map<String, String>> tone,
            Map<String, String> strength,
            Map<String, String> weakness,
            Map<String, String> tips,
            String hintPrefix,
            Outlines outlines,
            Report report) {
    }

    public record Outlines(
            String leadWithKeywords,
            String lead,
            List<String> technical,
            List<String> project,
            List<String> hr) {
    }

    public record Report(List<Band> bands, Highlights highlights, Focus focus, Empty empty) {
    }

    public record Band(double min, String label) {
    }

    public record Highlights(
            String bestAnswer,
            Map<String, String> strength,
            String pace,
            String noFillers,
            String confidenceUp) {
    }

    public record Focus(
            Map<String, String> weakness,
            String fast,
            String slow,
            String fillers,
            String skipped,
            String hints,
            String confidenceDown) {
    }

    public record Empty(String highlight, String focus) {
    }

    public record Lexicon(
            List<String> fillers,
            List<String> connectors,
            List<String> examples,
            List<String> signposts,
            Star star,
            List<String> quantifiers,
            List<String> stopwords) {
    }

    public record Star(List<String> situation, List<String> action, List<String> result) {
    }
}
