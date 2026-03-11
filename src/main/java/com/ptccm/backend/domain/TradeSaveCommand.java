package com.ptccm.backend.domain;

public record TradeSaveCommand(
        String title,
        String tradePartner,
        String status,
        String notes
) {}
