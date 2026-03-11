package com.ptccm.backend.service.impl;

import com.ptccm.backend.domain.CollectionUpdateCommand;
import com.ptccm.backend.domain.CollectionUpsertCommand;
import com.ptccm.backend.domain.TradeItemSaveCommand;
import com.ptccm.backend.domain.TradeSaveCommand;
import com.ptccm.backend.repository.DataRepository;
import com.ptccm.backend.service.DataApiService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DataApiServiceImpl implements DataApiService {

    private final DataRepository repository;

    public DataApiServiceImpl(DataRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<Map<String, Object>> getGameSeries() {
        return repository.findGameSeries();
    }

    @Override
    public List<Map<String, Object>> getCardSets() {
        List<Map<String, Object>> rows = repository.findCardSets();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> cardSet = new LinkedHashMap<>();
            cardSet.put("id", row.get("id"));
            cardSet.put("game_series_id", row.get("game_series_id"));
            cardSet.put("name", row.get("name"));
            cardSet.put("total_cards", row.get("total_cards"));

            Map<String, Object> series = new LinkedHashMap<>();
            series.put("id", row.get("gs_id"));
            series.put("name", row.get("gs_name"));
            cardSet.put("game_series", series);

            result.add(cardSet);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getCollection(String userId) {
        List<Map<String, Object>> rows = repository.findCollectionRowsByUser(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(mapCollectionRow(row));
        }
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> upsertCollectionItem(String userId, CollectionUpsertCommand command) {
        String resolvedSeriesId = command.seriesId();
        if ("__new__".equals(resolvedSeriesId)) {
            if (command.newSeriesName() == null || command.newSeriesName().isBlank()) {
                throw new IllegalArgumentException("Game series name is required.");
            }
            resolvedSeriesId = repository.upsertSeriesAndReturnId(command.newSeriesName().trim());
        }

        if (resolvedSeriesId == null || resolvedSeriesId.isBlank()) {
            throw new IllegalArgumentException("Please select a game series.");
        }

        String resolvedSetId = command.setId();
        if ("__new__".equals(resolvedSetId)) {
            if (command.newSetName() == null || command.newSetName().isBlank()) {
                throw new IllegalArgumentException("Card set name is required.");
            }
            resolvedSetId = repository.insertCardSetAndReturnId(
                    resolvedSeriesId,
                    command.newSetName().trim(),
                    command.newSetTotalCards()
            );
        }

        if (resolvedSetId == null || resolvedSetId.isBlank()) {
            throw new IllegalArgumentException("Please select a card set.");
        }

        if (command.cardName() == null || command.cardName().isBlank()) {
            throw new IllegalArgumentException("Card name is required.");
        }

        String cardName = command.cardName().trim();
        List<String> existing = repository.findCardIdsBySetAndName(resolvedSetId, cardName);
        String cardId = existing.isEmpty()
                ? repository.insertCardAndReturnId(
                    resolvedSetId,
                    cardName,
                    emptyToNull(command.cardNumber()),
                    emptyToNull(command.cardType()),
                    emptyToNull(command.rarity())
                )
                : existing.get(0);

        String collectionId = repository.upsertCollectionAndReturnId(
                userId,
                cardId,
                command.quantity(),
                command.estimatedValue(),
                command.condition(),
                command.duplicateAction(),
                emptyToNull(command.notes())
        );

        return getCollectionItemById(collectionId, userId);
    }

    @Override
    @Transactional
    public void updateCollectionItem(String userId, String itemId, CollectionUpdateCommand command) {
        int updated = repository.updateCollectionItem(
                userId,
                itemId,
                command.quantity(),
                command.estimatedValue(),
                command.condition(),
                command.duplicateAction(),
                emptyToNull(command.notes())
        );

        if (updated == 0) {
            throw new IllegalArgumentException("Collection item not found.");
        }
    }

    @Override
    @Transactional
    public void deleteCollectionItem(String userId, String itemId) {
        // Get the card_id before deleting
        String cardId = repository.findCardIdByCollectionItem(userId, itemId);
        
        // Delete from user_collection
        int rows = repository.deleteCollectionItem(userId, itemId);
        if (rows == 0) {
            throw new IllegalArgumentException("Item not found or not yours.");
        }

        // Delete the card if no other user owns it
        if (cardId != null) {
            int owners = repository.countCardOwners(cardId);
            if (owners == 0) {
                repository.deleteCard(cardId);
            }
        }
    }

    @Override
    @Transactional
    public void updateDuplicateAction(String userId, String itemId, String duplicateAction) {
        repository.updateDuplicateAction(userId, itemId, duplicateAction);
    }

    @Override
    public List<Map<String, Object>> getTrades(String userId) {
        List<Map<String, Object>> rows = repository.findTradesWithItemsByUser(userId);
        Map<String, Map<String, Object>> byTradeId = new LinkedHashMap<>();

        for (Map<String, Object> row : rows) {
            String tradeId = asText(row.get("t_id"));
            Map<String, Object> trade = byTradeId.computeIfAbsent(tradeId, ignored -> {
                Map<String, Object> t = new LinkedHashMap<>();
                t.put("id", row.get("t_id"));
                t.put("user_id", row.get("t_user_id"));
                t.put("title", row.get("t_title"));
                t.put("trade_partner", row.get("t_trade_partner"));
                t.put("status", row.get("t_status"));
                t.put("notes", row.get("t_notes"));
                t.put("created_at", row.get("t_created_at"));
                t.put("updated_at", row.get("t_updated_at"));
                t.put("trade_items", new ArrayList<Map<String, Object>>());
                return t;
            });

            if (row.get("ti_id") != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> items = (List<Map<String, Object>>) trade.get("trade_items");
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", row.get("ti_id"));
                item.put("trade_id", row.get("ti_trade_id"));
                item.put("card_id", row.get("ti_card_id"));
                item.put("card_name", row.get("ti_card_name"));
                item.put("direction", row.get("ti_direction"));
                item.put("quantity", row.get("ti_quantity"));
                item.put("estimated_value", row.get("ti_estimated_value"));
                items.add(item);
            }
        }

        return new ArrayList<>(byTradeId.values());
    }

    @Override
    @Transactional
    public void createTrade(String userId, TradeSaveCommand command) {
        repository.insertTrade(
                userId,
                emptyToNull(command.title()),
                emptyToNull(command.tradePartner()),
                command.status(),
                emptyToNull(command.notes())
        );
    }

    @Override
    @Transactional
    public void updateTrade(String userId, String tradeId, TradeSaveCommand command) {
        repository.updateTrade(
                userId,
                tradeId,
                emptyToNull(command.title()),
                emptyToNull(command.tradePartner()),
                command.status(),
                emptyToNull(command.notes())
        );
    }

    @Override
    @Transactional
    public void deleteTrade(String userId, String tradeId) {
        int rows = repository.deleteTrade(userId, tradeId);
        if (rows == 0) {
            throw new IllegalArgumentException("Trade not found or not yours.");
        }
    }

    @Override
    @Transactional
    public void updateTradeStatus(String userId, String tradeId, String status) {
        List<String> statuses = repository.findTradeStatus(userId, tradeId);
        if (statuses.isEmpty()) {
            throw new IllegalArgumentException("Trade not found.");
        }

        String currentStatus = statuses.get(0);
        boolean markingComplete = "completed".equals(status) && !"completed".equals(currentStatus);
        boolean undoingComplete = "completed".equals(currentStatus) && !"completed".equals(status);

        repository.updateTradeStatus(userId, tradeId, status);

        if (markingComplete) {
            List<Map<String, Object>> offeringItems = repository.findOfferingItemsByTradeId(tradeId);
            for (Map<String, Object> item : offeringItems) {
                String cardId = asText(item.get("card_id"));
                Integer qty = asInt(item.get("quantity"));
                repository.decrementCollectionQuantityByCard(userId, cardId, qty);
                repository.deleteCollectionCardsWithNonPositiveQuantity(userId, cardId);
            }
        }

        if (undoingComplete) {
            List<Map<String, Object>> offeringItems = repository.findOfferingItemsByTradeId(tradeId);
            for (Map<String, Object> item : offeringItems) {
                repository.restoreCollectionCard(
                        userId,
                        asText(item.get("card_id")),
                        asInt(item.get("quantity")),
                        asBigDecimal(item.get("estimated_value"))
                );
            }
        }
    }

    @Override
    @Transactional
    public void addTradeItem(String userId, String tradeId, TradeItemSaveCommand command) {
        int ownerCount = repository.countTradesOwnedByUser(userId, tradeId);
        if (ownerCount == 0) {
            throw new IllegalArgumentException("Trade not found.");
        }

        repository.insertTradeItem(
                tradeId,
                emptyToNull(command.cardId()),
                emptyToNull(command.cardName()),
                command.direction(),
                command.quantity(),
                command.estimatedValue()
        );
    }

    @Override
    @Transactional
    public void deleteTradeItem(String userId, String tradeId, String itemId) {
        // Get trade item details to check if it was an offering
        Map<String, Object> tradeItem = repository.findTradeItemDetails(userId, tradeId, itemId);
        if (tradeItem == null) {
            throw new IllegalArgumentException("Trade item not found or not yours.");
        }

        // If it was an offering item with a card, restore it to user's collection
        String direction = (String) tradeItem.get("direction");
        String cardId = (String) tradeItem.get("card_id");
        if ("offering".equals(direction) && cardId != null) {
            Integer quantity = asInt(tradeItem.get("quantity"));
            BigDecimal estimatedValue = asBigDecimal(tradeItem.get("estimated_value"));
            repository.restoreCollectionCard(userId, cardId, quantity, estimatedValue);
        }

        // Delete the trade item
        int rows = repository.deleteTradeItem(userId, tradeId, itemId);
        if (rows == 0) {
            throw new IllegalArgumentException("Trade item not found or not yours.");
        }
    }

    private Map<String, Object> getCollectionItemById(String id, String userId) {
        List<Map<String, Object>> rows = repository.findCollectionItemRowByIdAndUser(id, userId);
        if (rows.isEmpty()) {
            return new HashMap<>();
        }
        return mapCollectionRow(rows.get(0));
    }

    private Map<String, Object> mapCollectionRow(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("id"));
        item.put("user_id", row.get("user_id"));
        item.put("card_id", row.get("card_id"));
        item.put("quantity", row.get("quantity"));
        item.put("estimated_value", row.get("estimated_value"));
        item.put("condition", row.get("condition"));
        item.put("duplicate_action", row.get("duplicate_action"));
        item.put("notes", row.get("notes"));
        item.put("created_at", row.get("created_at"));
        item.put("updated_at", row.get("updated_at"));

        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", row.get("c_id"));
        card.put("name", row.get("c_name"));
        card.put("card_number", row.get("c_card_number"));
        card.put("card_type", row.get("c_card_type"));
        card.put("rarity", row.get("c_rarity"));

        Map<String, Object> set = new LinkedHashMap<>();
        set.put("id", row.get("cs_id"));
        set.put("game_series_id", row.get("cs_game_series_id"));
        set.put("name", row.get("cs_name"));
        set.put("total_cards", row.get("cs_total_cards"));

        Map<String, Object> series = new LinkedHashMap<>();
        series.put("id", row.get("gs_id"));
        series.put("name", row.get("gs_name"));

        set.put("game_series", series);
        card.put("card_set", set);
        item.put("card", card);
        return item;
    }

    private static String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    private static String asText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static Integer asInt(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number n) {
            return n.intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }

    private static BigDecimal asBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        return new BigDecimal(String.valueOf(value));
    }
}
