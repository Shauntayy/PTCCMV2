package com.ptccm.backend.controller;

import com.ptccm.backend.domain.CollectionUpdateCommand;
import com.ptccm.backend.domain.CollectionUpsertCommand;
import com.ptccm.backend.domain.TradeItemSaveCommand;
import com.ptccm.backend.domain.TradeSaveCommand;
import com.ptccm.backend.service.DataApiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Thin HTTP layer that validates transport concerns and delegates business/data work
 * to {@link DataApiService}.
 */
@RestController
@RequestMapping("/api")
public class DataApiController {

    private final DataApiService service;

    public DataApiController(DataApiService service) {
        this.service = service;
    }

    @GetMapping("/catalog/game-series")
    public List<Map<String, Object>> gameSeries() {
        return service.getGameSeries();
    }

    @GetMapping("/catalog/card-sets")
    public List<Map<String, Object>> cardSets() {
        return service.getCardSets();
    }

    @GetMapping("/collection")
    public List<Map<String, Object>> collection(@RequestHeader("X-User-Id") String userId) {
        return service.getCollection(userId);
    }

    @PostMapping("/collection/upsert")
    public Map<String, Object> upsertCollection(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody CollectionUpsertRequest request
    ) {
        return service.upsertCollectionItem(userId, new CollectionUpsertCommand(
                request.seriesId(),
                request.newSeriesName(),
                request.setId(),
                request.newSetName(),
                request.newSetTotalCards(),
                request.cardName(),
                request.cardNumber(),
                request.cardType(),
                request.rarity(),
                request.quantity(),
                request.estimatedValue(),
                request.condition(),
                request.duplicateAction(),
                request.notes()
        ));
    }

    @PutMapping("/collection/{id}")
    public ResponseEntity<Void> updateCollection(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id,
            @RequestBody CollectionUpdateRequest request
    ) {
        service.updateCollectionItem(userId, id, new CollectionUpdateCommand(
                request.quantity(),
                request.estimatedValue(),
                request.condition(),
                request.duplicateAction(),
                request.notes()
        ));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/collection/{id}")
    public ResponseEntity<Void> deleteCollection(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id
    ) {
        service.deleteCollectionItem(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/collection/{id}/duplicate-action")
    public ResponseEntity<Void> updateDuplicateAction(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id,
            @RequestBody DuplicateActionUpdateRequest request
    ) {
        // Duplicate action is a lightweight partial update used by the duplicates page.
        service.updateDuplicateAction(userId, id, request.duplicateAction());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/trades")
    public List<Map<String, Object>> trades(@RequestHeader("X-User-Id") String userId) {
        return service.getTrades(userId);
    }

    @PostMapping("/trades")
    public ResponseEntity<Void> createTrade(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody TradeSaveRequest request
    ) {
        service.createTrade(userId, new TradeSaveCommand(
                request.title(),
                request.tradePartner(),
                request.status(),
                request.notes()
        ));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/trades/{tradeId}")
    public ResponseEntity<Void> updateTrade(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String tradeId,
            @RequestBody TradeSaveRequest request
    ) {
        service.updateTrade(userId, tradeId, new TradeSaveCommand(
                request.title(),
                request.tradePartner(),
                request.status(),
                request.notes()
        ));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/trades/{tradeId}")
    public ResponseEntity<Void> deleteTrade(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String tradeId
    ) {
        service.deleteTrade(userId, tradeId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/trades/{tradeId}/status")
    public ResponseEntity<Void> updateTradeStatus(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String tradeId,
            @RequestBody TradeStatusUpdateRequest request
    ) {
        // Status transitions may affect collection quantities in the service layer.
        service.updateTradeStatus(userId, tradeId, request.status());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/trades/{tradeId}/items")
    public ResponseEntity<Void> addTradeItem(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String tradeId,
            @RequestBody TradeItemSaveRequest request
    ) {
        service.addTradeItem(userId, tradeId, new TradeItemSaveCommand(
                request.cardId(),
                request.cardName(),
                request.direction(),
                request.quantity(),
                request.estimatedValue()
        ));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/trades/{tradeId}/items/{itemId}")
    public ResponseEntity<Void> deleteTradeItem(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String tradeId,
            @PathVariable String itemId
    ) {
        service.deleteTradeItem(userId, tradeId, itemId);
        return ResponseEntity.noContent().build();
    }

    public record CollectionUpsertRequest(
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

    public record CollectionUpdateRequest(
            Integer quantity,
            BigDecimal estimatedValue,
            String condition,
            String duplicateAction,
            String notes
    ) {}

    public record DuplicateActionUpdateRequest(String duplicateAction) {}

    public record TradeSaveRequest(
            String title,
            String tradePartner,
            String status,
            String notes
    ) {}

    public record TradeStatusUpdateRequest(String status) {}

    public record TradeItemSaveRequest(
            String cardId,
            String cardName,
            String direction,
            Integer quantity,
            BigDecimal estimatedValue
    ) {}
}
