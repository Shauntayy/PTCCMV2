package com.ptccm.backend.service;

import com.ptccm.backend.domain.CollectionUpdateCommand;
import com.ptccm.backend.domain.CollectionUpsertCommand;
import com.ptccm.backend.domain.TradeItemSaveCommand;
import com.ptccm.backend.domain.TradeSaveCommand;

import java.util.List;
import java.util.Map;

public interface DataApiService {

    List<Map<String, Object>> getGameSeries();

    List<Map<String, Object>> getCardSets();

    List<Map<String, Object>> getCollection(String userId);

    Map<String, Object> upsertCollectionItem(String userId, CollectionUpsertCommand command);

    void updateCollectionItem(String userId, String itemId, CollectionUpdateCommand command);

    void deleteCollectionItem(String userId, String itemId);

    void updateDuplicateAction(String userId, String itemId, String duplicateAction);

    List<Map<String, Object>> getTrades(String userId);

    void createTrade(String userId, TradeSaveCommand command);

    void updateTrade(String userId, String tradeId, TradeSaveCommand command);

    void deleteTrade(String userId, String tradeId);

    void updateTradeStatus(String userId, String tradeId, String status);

    void addTradeItem(String userId, String tradeId, TradeItemSaveCommand command);

    void deleteTradeItem(String userId, String tradeId, String itemId);
}
