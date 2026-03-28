package com.ptccm.backend.service;

import com.ptccm.backend.domain.CollectionUpsertCommand;
import com.ptccm.backend.domain.TradeItemSaveCommand;
import com.ptccm.backend.repository.DataRepository;
import com.ptccm.backend.service.impl.DataApiServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataApiServiceImplTest {

    @Mock
    private DataRepository repository;

    @InjectMocks
    private DataApiServiceImpl service;

    @Test
    void upsertCollectionItemCreatesSeriesSetAndCardWhenRequested() {
        // Verifies the main add-card workflow when the user creates missing series/set metadata on the fly.
        CollectionUpsertCommand command = new CollectionUpsertCommand(
                "__new__",
                "Pokemon",
                "__new__",
                "151",
                165,
                "Charizard ex",
                "006/165",
                "Pokemon",
                "Ultra Rare",
                2,
                BigDecimal.valueOf(19.99),
                "Near Mint",
                "for_trade",
                "Fresh pull"
        );

        when(repository.upsertSeriesAndReturnId("Pokemon")).thenReturn("series-1");
        when(repository.insertCardSetAndReturnId("series-1", "151", 165)).thenReturn("set-1");
        when(repository.findCardIdsBySetAndName("set-1", "Charizard ex")).thenReturn(List.of());
        when(repository.insertCardAndReturnId("set-1", "Charizard ex", "006/165", "Pokemon", "Ultra Rare"))
                .thenReturn("card-1");
        when(repository.upsertCollectionAndReturnId(
                "user-1",
                "card-1",
                2,
                BigDecimal.valueOf(19.99),
                "Near Mint",
                "for_trade",
                "Fresh pull"
        )).thenReturn("collection-1");
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "collection-1");
        row.put("user_id", "user-1");
        row.put("card_id", "card-1");
        row.put("quantity", 2);
        row.put("estimated_value", BigDecimal.valueOf(19.99));
        row.put("condition", "Near Mint");
        row.put("duplicate_action", "for_trade");
        row.put("notes", "Fresh pull");
        row.put("created_at", "2026-03-28T00:00:00Z");
        row.put("updated_at", "2026-03-28T00:00:00Z");
        row.put("c_id", "card-1");
        row.put("c_name", "Charizard ex");
        row.put("c_card_number", "006/165");
        row.put("c_card_type", "Pokemon");
        row.put("c_rarity", "Ultra Rare");
        row.put("cs_id", "set-1");
        row.put("cs_game_series_id", "series-1");
        row.put("cs_name", "151");
        row.put("cs_total_cards", 165);
        row.put("gs_id", "series-1");
        row.put("gs_name", "Pokemon");
        when(repository.findCollectionItemRowByIdAndUser("collection-1", "user-1")).thenReturn(List.of(row));

        Map<String, Object> result = service.upsertCollectionItem("user-1", command);

        assertThat(result).containsEntry("id", "collection-1");
        assertThat(result).containsEntry("quantity", 2);
        assertThat(result).extractingByKey("card").asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("name", "Charizard ex");

        verify(repository).upsertSeriesAndReturnId("Pokemon");
        verify(repository).insertCardSetAndReturnId("series-1", "151", 165);
        verify(repository).insertCardAndReturnId("set-1", "Charizard ex", "006/165", "Pokemon", "Ultra Rare");
    }

    @Test
    void upsertCollectionItemRejectsBlankNewSeriesName() {
        CollectionUpsertCommand command = new CollectionUpsertCommand(
                "__new__",
                "   ",
                "set-1",
                null,
                null,
                "Pikachu",
                null,
                null,
                null,
                1,
                BigDecimal.ONE,
                "Near Mint",
                "keep",
                null
        );

        assertThatThrownBy(() -> service.upsertCollectionItem("user-1", command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Game series name is required.");

        verify(repository, never()).upsertSeriesAndReturnId(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void updateTradeStatusWhenCompletedRemovesOfferingCardsFromCollection() {
        // Completing a trade should consume cards the user is offering.
        when(repository.findTradeStatus("user-1", "trade-1")).thenReturn(List.of("proposed"));
        when(repository.findOfferingItemsByTradeId("trade-1")).thenReturn(List.of(
                Map.of("card_id", "card-1", "quantity", 2, "estimated_value", BigDecimal.valueOf(3.50))
        ));

        service.updateTradeStatus("user-1", "trade-1", "completed");

        verify(repository).updateTradeStatus("user-1", "trade-1", "completed");
        verify(repository).decrementCollectionQuantityByCard("user-1", "card-1", 2);
        verify(repository).deleteCollectionCardsWithNonPositiveQuantity("user-1", "card-1");
    }

    @Test
    void deleteTradeItemRestoresOfferingCardBeforeDelete() {
        // Removing an offered trade item should put the card back into the collection.
        when(repository.findTradeItemDetails("user-1", "trade-1", "item-1")).thenReturn(Map.of(
                "direction", "offering",
                "card_id", "card-1",
                "quantity", 1,
                "estimated_value", BigDecimal.valueOf(4.25)
        ));
        when(repository.deleteTradeItem("user-1", "trade-1", "item-1")).thenReturn(1);

        service.deleteTradeItem("user-1", "trade-1", "item-1");

        verify(repository).restoreCollectionCard("user-1", "card-1", 1, BigDecimal.valueOf(4.25));
        verify(repository).deleteTradeItem("user-1", "trade-1", "item-1");
    }

    @Test
    void addTradeItemRejectsUnknownTrade() {
        when(repository.countTradesOwnedByUser("user-1", "trade-1")).thenReturn(0);

        assertThatThrownBy(() -> service.addTradeItem(
                "user-1",
                "trade-1",
                new TradeItemSaveCommand("card-1", "Pikachu", "offering", 1, BigDecimal.ONE)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Trade not found.");
    }
}
