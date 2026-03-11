package com.ptccm.backend.domain;

import java.math.BigDecimal;

public record CollectionUpdateCommand(
        Integer quantity,
        BigDecimal estimatedValue,
        String condition,
        String duplicateAction,
        String notes
) {}
