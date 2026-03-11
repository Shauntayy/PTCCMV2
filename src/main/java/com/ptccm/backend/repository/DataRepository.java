package com.ptccm.backend.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface DataRepository {

    List<Map<String, Object>> findGameSeries();

    List<Map<String, Object>> findCardSets();

    List<Map<String, Object>> findCollectionRowsByUser(String userId);

    List<Map<String, Object>> findCollectionItemRowByIdAndUser(String itemId, String userId);

    String upsertSeriesAndReturnId(String seriesName);

    String insertCardSetAndReturnId(String seriesId, String setName, Integer totalCards);

    List<String> findCardIdsBySetAndName(String setId, String cardName);

    String insertCardAndReturnId(String setId, String cardName, String cardNumber, String cardType, String rarity);

    String upsertCollectionAndReturnId(
            String userId,
            String cardId,
            Integer quantity,
            BigDecimal estimatedValue,
            String condition,
            String duplicateAction,
            String notes
    );

    int updateCollectionItem(
            String userId,
            String itemId,
            Integer quantity,
            BigDecimal estimatedValue,
            String condition,
            String duplicateAction,
            String notes
    );

    int deleteCollectionItem(String userId, String itemId);

    String findCardIdByCollectionItem(String userId, String itemId);

    int countCardOwners(String cardId);

    void deleteCard(String cardId);

    int updateDuplicateAction(String userId, String itemId, String duplicateAction);

    List<Map<String, Object>> findTradesWithItemsByUser(String userId);

    void insertTrade(String userId, String title, String tradePartner, String status, String notes);

    int updateTrade(String userId, String tradeId, String title, String tradePartner, String status, String notes);

    int deleteTrade(String userId, String tradeId);

    List<String> findTradeStatus(String userId, String tradeId);

    int updateTradeStatus(String userId, String tradeId, String status);

    List<Map<String, Object>> findOfferingItemsByTradeId(String tradeId);

    void decrementCollectionQuantityByCard(String userId, String cardId, Integer quantity);

    void deleteCollectionCardsWithNonPositiveQuantity(String userId, String cardId);

    void restoreCollectionCard(String userId, String cardId, Integer quantity, BigDecimal estimatedValue);

    int countTradesOwnedByUser(String userId, String tradeId);

    void insertTradeItem(
            String tradeId,
            String cardId,
            String cardName,
            String direction,
            Integer quantity,
            BigDecimal estimatedValue
    );

    Map<String, Object> findTradeItemDetails(String userId, String tradeId, String itemId);

    int deleteTradeItem(String userId, String tradeId, String itemId);
}
