package com.ptccm.backend.domain;

import java.math.BigDecimal;

public record TradeItemSaveCommand(
        String cardId,
        String cardName,
        String direction,
        Integer quantity,
        BigDecimal estimatedValue
) {}
