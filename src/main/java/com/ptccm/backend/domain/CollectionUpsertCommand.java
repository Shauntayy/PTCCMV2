package com.ptccm.backend.domain;

import java.math.BigDecimal;

public record CollectionUpsertCommand(
        String seriesId,
        String newSeriesName,
        String setId,
        String newSetName,
        Integer newSetTotalCards,
        String cardName,
        String cardNumber,
        String cardType,
        String rarity,
        Integer quantity,
        BigDecimal estimatedValue,
        String condition,
        String duplicateAction,
        String notes
) {}
